const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'https://corujalinks.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 try{
 const authorization=req.headers.get('Authorization')||'';
 const auth=await fetch(base+'/auth/v1/user',{headers:{apikey:service,Authorization:authorization}});
 if(!auth.ok)return json({error:'Entre novamente para usar a IA.'},401);
 const current=await auth.json();if(!current.id)return json({error:'Entre novamente.'},401);
 const raw=await req.text();if(raw.length>16000)return json({error:'Seu pedido é muito longo.'});
 let input;try{input=JSON.parse(raw)}catch{return json({error:'Pedido inválido.'})}
 if(typeof input.brief!=='string'||input.brief.trim().length<10||input.brief.length>3000)return json({error:'Descreva sua ideia em 10 a 3.000 caracteres.'});
 const key=Deno.env.get('OPENAI_API_KEY');
 if(!key)return json({error:'A IA ainda precisa ser ativada pelo administrador. A criação manual já está disponível.'});
 const quota=await fetch(base+'/rest/v1/rpc/consume_ai_quota',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({p_user:current.id})});
 if(!quota.ok)return json({error:'Não foi possível verificar o limite de uso. Tente mais tarde.'});
 if(!(await quota.json()))return json({error:'Aguarde 10 segundos entre pedidos. O limite é de 30 pedidos por dia.'});
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(45000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',store:false,max_output_tokens:1600,instructions:'Escreva um rascunho claro em português do Brasil para uma página. Não invente datas, preços, endereços, fontes, garantias ou contatos. Não se passe por órgãos, marcas ou pessoas. Não solicite localização, câmera, senha ou dados financeiros. Use texto simples, sem HTML ou Markdown. Preserve os fatos do pedido; quando faltarem detalhes, escreva de modo genérico. Título de até 180 caracteres, conteúdo principal de até 5000 caracteres, descrição de até 1000. O usuário revisará antes de publicar.',input:JSON.stringify({tipo:typeof input.page_type==='string'?input.page_type.slice(0,30):'personalizada',pedido:input.brief}),text:{format:{type:'json_schema',name:'page_draft',strict:true,schema:{type:'object',properties:{title:{type:'string'},main_text:{type:'string'},description:{type:'string'}},required:['title','main_text','description'],additionalProperties:false}}}})});
 if(!response.ok)return json({error:response.status===429?'A IA atingiu o limite do serviço. Verifique o saldo ou tente mais tarde.':'Não foi possível gerar o texto. Confira a configuração do serviço de IA.'});
 const data=await response.json();if(data.status!=='completed')return json({error:'A geração não foi concluída. Tente um pedido mais curto.'});
 const text=(data.output||[]).flatMap((item:any)=>item.content||[]).filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
 let draft;try{draft=JSON.parse(text)}catch{return json({error:'Não foi possível criar esse rascunho. Reformule seu pedido.'})}
 if(!['title','main_text','description'].every(k=>typeof draft[k]==='string'))return json({error:'Resposta inválida. Tente novamente.'});
 return json({title:draft.title.slice(0,180),main_text:draft.main_text.slice(0,5000),description:draft.description.slice(0,1000)});
 }catch{return json({error:'O serviço demorou a responder. Tente novamente em instantes.'})}
});
