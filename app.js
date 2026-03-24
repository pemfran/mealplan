import {
  AppState,
  PROFILES,
  PLAN
} from "./data.js";

import {
  loadReplacedMeals,
  addDislike,
  loadDislikes,
  upsertReplacedMeal
} from "./api.js";

import {
  lbl
} from "./logic.js";


window.addEventListener(
  "DOMContentLoaded",
  init
);


async function init(){

  const saved =
  localStorage.getItem("meal-who");

  if(saved){

    AppState.who = saved;

    document
    .getElementById("setup-screen")
    .style.display="none";

    document
    .getElementById("app")
    .style.display="block";

    await initApp();
  }
}


export async function initApp(){

  AppState.replacedMeals =
  await loadReplacedMeals();

  render();
}



function render(){

  console.log(
    "render plan",
    PLAN
  );
}