const base=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const auth={apikey:key,Authorization:'Bearer '+key};
Deno.serve(async(req)=>{
 const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'https://corujalinks.github.io'};
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers});
 const code=new URL(req.url).searchParams.get('code')||'';
 if(!/^[A-Z0-9]{6,16}$/.test(code))return new Response('Not found',{status:404,headers});
 try{
 const bearer=req.headers.get('Authorization')||'';
 const check=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});
 if(!check.ok)return new Response('Unauthorized',{status:401,headers});
 const current=await check.json();
 if(!current.id)return new Response('Unauthorized',{status:401,headers});
 const response=await fetch(base+'/rest/v1/links?select=image_url,owner_id&code=eq.'+encodeURIComponent(code)+'&status=eq.active&limit=1',{headers:auth});
 if(!response.ok)throw Error();
 const rows=await response.json(),row=rows[0];
 if(!row?.image_url||row.owner_id!==current.id||!row.image_url.startsWith(row.owner_id+'/')||!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(row.image_url))return new Response('Not found',{status:404,headers});
 const file=await fetch(base+'/storage/v1/object/authenticated/link-images/'+row.image_url,{headers:auth});
 if(!file.ok)return new Response('Not found',{status:404,headers});
 const type=file.headers.get('Content-Type')?.split(';')[0]||'';
 if(!['image/jpeg','image/png','image/webp'].includes(type))return new Response('Not found',{status:404,headers});
 return new Response(file.body,{headers:{...headers,'Content-Type':type}});
 }catch{return new Response('Unavailable',{status:503,headers})}
});
