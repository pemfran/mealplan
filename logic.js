export function extractJsonObject(text){

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if(start===-1){
    throw new Error("JSON not found");
  }

  return text.slice(start,end+1);
}


export function extractJsonArray(text){

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');

  return text.slice(start,end+1);
}


export async function withRetry(fn, attempts=2){

  let err;

  for(let i=0;i<attempts;i++){

    try{
      return await fn();
    }catch(e){

      err=e;

      await new Promise(
        r=>setTimeout(r,500)
      );
    }
  }

  throw err;
}


export function lbl(t){

  return {
    breakfast:'Сніданок',
    lunch:'Обід',
    lunch_2:'Обід 2',
    snack:'Перекус',
    dinner:'Вечеря'
  }[t] || t;
}