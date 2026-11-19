'use strict';
const API = 'https://yxictjjcxppbkptgmknh.supabase.co/functions/v1/pulse-eco-api';
const KEY = 'pulse_eco_pages_draft_v1';
const $ = (s) => document.querySelector(s);
const e = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { questions: [], attempt: null, result: null, busy: false };
function toast(msg) { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),4500); }
function shuffle(items) {
  const a=[...items];
  for(let i=a.length-1;i>0;i--) {
    const n=new Uint32Array(1); crypto.getRandomValues(n);
    const j=n[0]%(i+1); [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
async function api(method='GET', data) {
  const res=await fetch(API, {
    method, mode:'cors', cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:data===undefined?undefined:JSON.stringify(data)
  });
  let json;
  try { json=await res.json(); } catch { throw Error('Не удалось прочитать ответ сервера'); }
  if(!res.ok) throw Error(json.error || `Ошибка ${res.status}`);
  return json;
}
function save() {
  try { if(state.attempt) sessionStorage.setItem(KEY,JSON.stringify(state.attempt)); else sessionStorage.removeItem(KEY); }
  catch {}
}
function validDraft(a) {
  const ids=state.questions.map(q=>q.id);
  return a && typeof a==='object' && a.attemptId &&
    Array.isArray(a.order) && a.order.length===ids.length &&
    new Set(a.order).size===ids.length && a.order.every(id=>ids.includes(id)) &&
    a.answers && typeof a.answers==='object' &&
    Number.isInteger(a.current) && a.current>=0 && a.current<ids.length &&
    a.person && [8,9,10,11].includes(a.person.classNumber);
}
async function init() {
  try {
    const data=await api();
    if(!Array.isArray(data.questions)||!data.questions.length) throw Error('Вопросы не загружены');
    state.questions=data.questions;
    try {
      const saved=JSON.parse(sessionStorage.getItem(KEY)||'null');
      if(validDraft(saved)) state.attempt=saved; else sessionStorage.removeItem(KEY);
    } catch {}
    render();
  } catch(err) {
    $('#app').innerHTML=`<div class="card empty"><h2>Не удалось загрузить олимпиаду</h2><p>${e(err.message)}</p><button class="btn btn-primary" data-action="retry">Повторить</button></div>`;
  }
}
function home() {
  return `<section class="hero"><div><div class="eyebrow"><span class="mini-dot"></span> Экологическая олимпиада · ${state.questions.length} вопросов</div>
    <h1>Маленькие решения.<br>Большие перемены.</h1>
    <p>Проверь свои знания об экологии. На выполнение можно потратить столько времени, сколько потребуется.</p>
    <span class="pill green">🌱 Экология</span> <span class="pill">До 3 попыток</span></div>
    <div class="hero-art"><div class="planet"></div><div class="float-tag a">♻️ ${state.questions.length} вопросов</div><div class="float-tag b">✨ Твой результат</div></div></section>
    <section class="intro-panel"><form id="registration" class="registration">
      <div class="field"><label for="lastName">Фамилия</label><input id="lastName" required maxlength="60" minlength="2" autocomplete="family-name" placeholder="Иванов"></div>
      <div class="field"><label for="firstName">Имя</label><input id="firstName" required maxlength="60" minlength="2" autocomplete="given-name" placeholder="Александр"></div>
      <div class="field"><label for="school">Школа</label><input id="school" required maxlength="120" minlength="2" placeholder="Школа № 3"></div>
      <div class="field"><label for="classNumber">Класс</label><select id="classNumber" required>
        <option value="">Выбери класс</option>${[8,9,10,11].map(n=>`<option value="${n}">${n} класс</option>`).join('')}</select></div>
      <p class="wide subnote">Указывай данные одинаково при каждой попытке. Система считает попытки по сочетанию фамилии, имени, школы и класса. Данные направляются организаторам олимпиады.</p>
      <label class="wide consent"><input id="notice" type="checkbox" required> Я ознакомился(-ась) с информацией об использовании моих данных для проведения олимпиады.</label>
      <button type="submit" class="btn btn-primary wide">Начать олимпиаду →</button>
    </form></section>`;
}
function begin() {
  if(state.busy) return;
  const person={
    lastName:$('#lastName').value.trim().replace(/\s+/g,' '),
    firstName:$('#firstName').value.trim().replace(/\s+/g,' '),
    school:$('#school').value.trim().replace(/\s+/g,' '),
    classNumber:Number($('#classNumber').value)
  };
  if([person.lastName,person.firstName,person.school].some(s=>s.length<2) ||
     ![8,9,10,11].includes(person.classNumber)) return toast('Проверь данные участника');
  const order=shuffle(state.questions.map(q=>q.id));
  const optionOrder=Object.fromEntries(state.questions.map(q=>[q.id,shuffle(q.options.map(o=>o.id))]));
  state.attempt={attemptId:crypto.randomUUID(),person,order,optionOrder,answers:{},current:0};
  state.result=null;save();render();window.scrollTo(0,0);
}
function quiz() {
  const a=state.attempt;
  const q=state.questions.find(q=>q.id===a.order[a.current]);
  if(!q) return `<div class="card">Вопрос не найден</div>`;
  const opts=(a.optionOrder[q.id]||q.options.map(o=>o.id)).map(id=>q.options.find(o=>o.id===id)).filter(Boolean);
  return `<div class="quiz-wrap"><div class="page-top"><div><div class="eyebrow">Pulse · Экоолимпиада</div>
  <h2>Вопрос ${a.current+1} из ${a.order.length}</h2>
  <p>Участник: <strong>${e(a.person.lastName)} ${e(a.person.firstName)}</strong></p></div></div>
  <div class="quiz-head"><span class="small muted">Вопрос ${a.current+1} из ${a.order.length}</span></div>
  <div class="quiz-progress"><progress class="progress" max="${a.order.length}" value="${a.current+1}"></progress></div>
  <section class="quiz-card"><span class="question-index">ВОПРОС ${a.current+1}</span><h2>${e(q.text)}</h2>
  <div class="option-list" role="radiogroup" aria-label="Варианты ответа">
  ${opts.map(o=>`<label class="option ${a.answers[q.id]===o.id?'selected':''}">
  <input type="radio" name="quiz-answer" value="${e(o.id)}" ${a.answers[q.id]===o.id?'checked':''}>
  <span>${e(o.text)}</span></label>`).join('')}</div></section>
  <div class="quiz-controls"><button class="btn btn-ghost" data-action="back" ${a.current===0?'disabled':''}>← Назад</button>
  <button class="btn btn-primary" data-action="next" ${state.busy?'disabled':''}>${a.current===a.order.length-1?'Завершить ✓':'Далее →'}</button></div>
  <p class="quiz-footer-hint">Пока эта вкладка открыта, можно вернуться к предыдущим вопросам.</p></div>`;
}
function result() {
  const r=state.result;
  return `<div class="quiz-wrap"><section class="result-hero">
  <div class="eyebrow">🌿 Олимпиада завершена</div>
  <div class="result-ring"><strong>${r.score}/${r.total}</strong></div>
  <h1>Результат сохранён</h1>
  <p>Ты набрал(а) <b>${r.score} из ${r.total}</b> баллов.</p>
  <p>Попытка: <b>${r.attemptNumber} из 3</b>. Осталось: <b>${r.remaining}</b>.</p>
  <p>Правильные ответы будут доступны после завершения олимпиады по решению организаторов.</p>
  <button class="btn btn-primary" data-action="new-attempt">Вернуться на главную</button>
  </section></div>`;
}
function render() { $('#app').innerHTML=state.result?result():state.attempt?quiz():home(); }
async function next() {
  if(state.busy) return;
  const a=state.attempt;
  if(!a.answers[a.order[a.current]]) return toast('Выбери ответ');
  if(a.current<a.order.length-1) { a.current++;save();render();window.scrollTo(0,0);return; }
  if(!confirm('Завершить олимпиаду и отправить ответы?')) return;
  state.busy=true;
  try {
    const r=await api('POST',{attemptId:a.attemptId,...a.person,order:a.order,answers:a.answers});
    state.result=r;state.attempt=null;save();render();window.scrollTo(0,0);
  } catch(err) { toast(err.message); }
  finally {state.busy=false;}
}
document.addEventListener('submit',ev=>{if(ev.target.id==='registration'){ev.preventDefault();begin();}});
document.addEventListener('change',ev=>{
  if(ev.target.name!=='quiz-answer'||!state.attempt)return;
  const a=state.attempt; a.answers[a.order[a.current]]=ev.target.value;save();render();
});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-action],[data-page]');
  if(!b||b.disabled)return;
  if(b.dataset.page==='home') { if(state.attempt&&!confirm('Прервать текущую попытку?'))return;state.attempt=null;state.result=null;save();render();return; }
  switch(b.dataset.action) {
    case 'retry': await init();break;
    case 'back': if(state.attempt){state.attempt.current=Math.max(0,state.attempt.current-1);save();render();}break;
    case 'next': await next();break;
    case 'new-attempt': state.result=null;render();break;
  }
});
init();
