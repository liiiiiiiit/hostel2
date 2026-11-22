export async function providerCall(path: string, body?: unknown) {
  const response = await fetch('/api/'+path,{method:body?'POST':'GET',credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Requested-With':'YerevanHub'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const data = await response.json();
  if(!response.ok)throw new Error(data.error||'Request failed');
  return data;
}
