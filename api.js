import { LS_KEY } from "./data.js";

export const SB_URL = 'https://rkacfuljpkjtehjkmqyc.supabase.co';

export const SB_KEY =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrYWNmdWxqcGtqdGVoamttcXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNDg4OTIsImV4cCI6MjA4OTgyNDg5Mn0.ydkfhtpCdidcIIc5Qaq9ZIuYaOulOEL9AjwLSSOy8Kc';

const SB_H = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

export const PROXY =
`${SB_URL}/functions/v1/claude-proxy`;


export async function callClaude(prompt, maxTokens = 2800) {

  const r = await fetch(PROXY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await r.json();

  const text =
    data?.content?.[0]?.text ||
    data?.text ||
    data?.response;

  if (!text) {
    throw new Error("Claude не повернув текст");
  }

  return text.trim();
}


export async function sbGet(table, query='') {

  const r = await fetch(
    `${SB_URL}/rest/v1/${table}?${query}`,
    { headers: SB_H }
  );

  if (!r.ok) {
    throw new Error(`GET ${table}`);
  }

  return r.json();
}


export async function sbDelete(table, query='') {

  const r = await fetch(
    `${SB_URL}/rest/v1/${table}?${query}`,
    {
      method:'DELETE',
      headers: SB_H
    }
  );

  if (!r.ok) {
    throw new Error(`DELETE ${table}`);
  }
}


export async function upsertReplacedMeal(mealId, mealData){

  const res = await fetch(
    `${SB_URL}/rest/v1/replaced_meals?on_conflict=meal_id`,
    {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SB_KEY,
        'Authorization':`Bearer ${SB_KEY}`,
        'Prefer':'resolution=merge-duplicates'
      },
      body:JSON.stringify([
        {
          meal_id:mealId,
          meal_data:mealData
        }
      ])
    }
  );

  if(!res.ok){
    throw new Error("upsert error");
  }
}


export async function loadReplacedMeals(){

  const res = await fetch(
    `${SB_URL}/rest/v1/replaced_meals?select=*`,
    {
      headers:{
        'apikey':SB_KEY,
        'Authorization':`Bearer ${SB_KEY}`
      }
    }
  );

  const rows = await res.json();

  const map = {};

  rows.forEach(r=>{
    map[r.meal_id] = r.meal_data;
  });

  return map;
}


export async function clearReplacedMeals(){

  await fetch(
    `${SB_URL}/rest/v1/replaced_meals?id=not.is.null`,
    {
      method:'DELETE',
      headers:{
        'apikey':SB_KEY,
        'Authorization':`Bearer ${SB_KEY}`
      }
    }
  );
}



export async function loadDislikes(){

  try{

    const data = await sbGet(
      'dislikes',
      'select=who,meal_name,meal_type'
    );

    return data.map(r=>({
      who:r.who,
      name:r.meal_name,
      type:r.meal_type
    }));

  }catch{

    return JSON.parse(
      localStorage.getItem(LS_KEY)||'[]'
    );
  }
}



export async function addDislike(name,type,who){

  try{

    await fetch(
      `${SB_URL}/rest/v1/dislikes`,
      {
        method:'POST',
        headers:SB_H,
        body:JSON.stringify({
          who,
          meal_name:name,
          meal_type:type
        })
      }
    );

  }catch{

    const l = JSON.parse(
      localStorage.getItem(LS_KEY)||'[]'
    );

    l.push({name,type,who});

    localStorage.setItem(
      LS_KEY,
      JSON.stringify(l)
    );
  }

  return loadDislikes();
}