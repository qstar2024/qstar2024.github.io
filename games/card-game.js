/* 80 Points - Single Page Card Game (client-side only)
   Tech: Vanilla JS (ES6), HTML, CSS
   Notes: Implements 2 decks (blue/red backs), dealing with trump show/overwrite, basic AI, singles/pairs/consecutive pairs, scoring, level progression incl. real-Jokers round.
*/

(() => {
  const SUITS = ["Spades", "Hearts", "Clubs", "Diamonds"];
  const VALUES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const JOKERS = [ {suit:"Jokers", value:"Small"}, {suit:"Jokers", value:"Big"} ];
  const DECKS = [ { id:"blue", name:"Blue" }, { id:"red", name:"Red" } ];

  const COMBO = { SINGLE:"single", PAIR:"pair", CONSEC:"consecutive_pairs" };
  const POSITIONS = ["bottom","right","top","left"]; // clockwise order of turns

  const el = {
    debugToggle: document.getElementById("debugToggle"),
    btnNew: document.getElementById("btnNew"),
    btnDeal: document.getElementById("btnDeal"),
    btnShow: document.getElementById("btnShow"),
    btnCenter: document.getElementById("btnCenter"),
    btnConfirmPlay: document.getElementById("btnConfirmPlay"),
    btnRestart: document.getElementById("btnRestart"),

    humanHand: document.getElementById("humanHand"),
    played: {
      bottom: document.querySelector("#trickGrid .slot[data-pos='bottom']"),
      left: document.querySelector("#trickGrid .slot[data-pos='left']"),
      top: document.querySelector("#trickGrid .slot[data-pos='top']"),
      right: document.querySelector("#trickGrid .slot[data-pos='right']"),
    },
    trickPoints: document.getElementById("trickPoints"),
    roundLabel: document.getElementById("roundLabel"),
    claimerLabel: document.getElementById("claimerLabel"),
    trumpLabel: document.getElementById("trumpLabel"),
    predLabel: document.getElementById("predLabel"),
    timerLabel: document.getElementById("timerLabel"),

    team1Score: document.getElementById("team1Score"),
    team2Score: document.getElementById("team2Score"),
    turnLabel: document.getElementById("turnLabel"),

    level: {
      bottom: document.getElementById("level-bottom"),
      left: document.getElementById("level-left"),
      top: document.getElementById("level-top"),
      right: document.getElementById("level-right"),
    },
    score: {
      bottom: document.getElementById("score-bottom"),
      left: document.getElementById("score-left"),
      top: document.getElementById("score-top"),
      right: document.getElementById("score-right"),
    },

    centerPile: document.getElementById("centerPile"),
    toast: document.getElementById("toast"),
    celebration: document.getElementById("celebration"),
  };

  const state = {
    debug: false,
    round: 1,
    players: {
      bottom: { name:"You", team:1, level:2, hand:[], score:0 },
      right:  { name:"AI Right", team:2, level:2, hand:[], score:0 },
      top:    { name:"AI Top", team:1, level:2, hand:[], score:0 },
      left:   { name:"AI Left", team:2, level:2, hand:[], score:0 },
    },
    teamScore: { 1:0, 2:0 }, // across rounds
    deck: [],
    center: [], // 8 cards facedown
    trump: { suit: null, source:null }, // suit or 'Jokers'
    predValue: "2", // predetermined value for round (by claimer level)
    claimer: null, // position string
    leadPos: null, // current trick leader position
    turnIndex: 0,  // 0..3 within trick
    trick: {},     // {pos:[cards]}
    trickHistory: [],
    showPhase: false,
    timers: { show: null, turn: null, seconds: 0 },
    selection: new Set(),
    claimedCenterThisRound: false,
    realJokersRound: false,
  };

  // Utilities
  function log(...args){ if(state.debug) console.log("[80]", ...args); }
  function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

  function makeDeck(){
    const deck = [];
    for(const d of DECKS){
      for(const s of SUITS){
        for(const v of VALUES){
          deck.push({ id:`${d.id}-${s}-${v}-${Math.random().toString(36).slice(2,8)}`, suit:s, value:v, back:d.id });
        }
      }
      for(const j of JOKERS){
        deck.push({ id:`${d.id}-J-${j.value}-${Math.random().toString(36).slice(2,8)}`, suit:"Jokers", value:j.value, back:d.id });
      }
    }
    return deck;
  }

  // Ranking helpers
  const valueOrder = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14 };
  function isJoker(c){ return c.suit === "Jokers"; }
  function isPred(c){ return c.value === state.predValue && c.suit !== "Jokers"; }
  function isTrump(c){
    if(state.realJokersRound) return isJoker(c);
    if(state.trump.suit === "Jokers") return isJoker(c) || isPred(c);
    if(!state.trump.suit) return false;
    return isJoker(c) || isPred(c) || c.suit === state.trump.suit;
  }
  function cardRank(c){
    // Overall hierarchy: BigJ > SmallJ > pred in trump suit > pred in other suits > other in trump > other non-trump
    if(isJoker(c)) return c.value === "Big" ? 1000 : 900;
    const pred = isPred(c);
    const trumpSuit = state.trump.suit;
    if (trumpSuit === "Jokers"){
      if(pred) return 800; // pred is trump when trump=Jokers
      // others normal ordering
      return valueOrder[c.value] || 0;
    }
    if(pred && c.suit === trumpSuit) return 700;
    if(pred && c.suit !== trumpSuit) return 650;
    if(c.suit === trumpSuit) return 600 + (valueOrder[c.value]||0);
    return valueOrder[c.value] || 0;
  }

  // Sorting function: ascending by display (non-trump to trump, then value)
  function sortHandForDisplay(hand){
    return hand.slice().sort((a,b)=>{
      const ta = isTrump(a) ? 1 : 0;
      const tb = isTrump(b) ? 1 : 0;
      if(ta !== tb) return ta - tb; // non-trump first
      // within, by suit then value
      if(a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return (valueOrder[a.value]||0) - (valueOrder[b.value]||0);
    });
  }

  // UI Rendering
  function suitSymbol(s){
    switch(s){
      case "Spades": return "♠";
      case "Hearts": return "♥";
      case "Clubs": return "♣";
      case "Diamonds": return "♦";
      case "Jokers": return "🃏";
      default: return s;
    }
  }

  function cardAlt(c){
    if(isJoker(c)) return `${c.back} back ${c.value} Joker`;
    return `${c.back} back ${c.value} of ${c.suit}`;
  }

  function createCardEl(c, {clickable=true, selected=false, asBack=false}={}){
    const div = document.createElement("div");
    div.className = "card deal";
    // Do not highlight trump on back-only render (e.g., center 8)
    if(!asBack && isTrump(c)) div.classList.add("trump");
    if(selected) div.classList.add("selected");
    div.setAttribute("role","option");
    div.setAttribute("aria-label", cardAlt(c));
    div.setAttribute("tabindex", clickable?"0":"-1");
    // reflect selection state for accessibility and CSS animations
    div.setAttribute("aria-pressed", selected?"true":"false");
    div.dataset.id = c.id;

    const front = document.createElement("div");
    front.className = "front";
    const back = document.createElement("div");
    back.className = `back ${c.back}`;

    if(asBack){
      div.appendChild(back);
    } else {
      const v = document.createElement("div");
      v.className = "value";
      // Label: Jokers as 'Joker' / 'Joker★'; standard cards show their face value (e.g., 'J')
      if(isJoker(c)){
        v.textContent = c.value === "Big" ? "Joker★" : "Joker";
      } else {
        v.textContent = c.value;
      }
      const s = document.createElement("div");
      s.className = "suit";
      s.textContent = suitSymbol(c.suit);
      const face = document.createElement("div");
      face.className = isJoker(c)?"joker":"";
      face.textContent = isJoker(c)? (c.value === "Big" ? "🃏★" : "🃏") : `${suitSymbol(c.suit)}`;
      front.appendChild(v); front.appendChild(face); front.appendChild(s);
      div.appendChild(front);
    }

    if(clickable){
      div.addEventListener("click", ()=>toggleSelect(c.id));
      div.addEventListener("keydown", (e)=>{
        if(e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSelect(c.id); }
      });
    } else {
      div.classList.add("disabled");
    }

    return div;
  }

  function render(){
    // header labels
    if(el.roundLabel) el.roundLabel.textContent = `Round ${state.round}`;
    if(el.claimerLabel) el.claimerLabel.textContent = `Claimer: ${state.claimer || '-'}`;
    if(el.trumpLabel) el.trumpLabel.textContent = `Trump: ${state.trump.suit || '-'}`;
    if(el.predLabel) el.predLabel.textContent = `Pred: ${state.predValue}`;
    if(el.team1Score) el.team1Score.textContent = state.teamScore[1];
    if(el.team2Score) el.team2Score.textContent = state.teamScore[2];
    if(el.turnLabel) el.turnLabel.textContent = `Turn: ${state.leadPos || '-'}`;

    for(const p of POSITIONS){
      if(el.level[p]) el.level[p].textContent = `Lv ${state.players[p].level}`;
      if(el.score[p]) el.score[p].textContent = `${state.players[p].score}`;
    }

    // human hand
    el.humanHand.innerHTML = "";
    const sorted = sortHandForDisplay(state.players.bottom.hand);
    sorted.forEach(c => {
      const selected = state.selection.has(c.id);
      const node = createCardEl(c,{clickable:true, selected});
      el.humanHand.appendChild(node);
    });

    // center pile backs
    el.centerPile.innerHTML = "";
    state.center.forEach((c, i) => {
      const node = createCardEl(c,{clickable:false, asBack:true});
      node.style.transform = `translateX(${i* -2}px) rotate(${(i%3)-1}deg)`;
      el.centerPile.appendChild(node);
    });

    // trick slots
    for(const pos of Object.keys(el.played)){
      const slot = el.played[pos];
      slot.innerHTML = "";
      const cards = state.trick[pos] || [];
      cards.forEach(c => slot.appendChild(createCardEl(c,{clickable:false})));
    }
  }

  function toast(msg, ms=1800){
    el.toast.textContent = msg; el.toast.classList.add("show");
    setTimeout(()=>el.toast.classList.remove("show"), ms);
  }

  // Selection handlers
  function toggleSelect(id){
    if(state.showPhase) { // allow selecting during deal for show decision
      if(state.selection.has(id)) state.selection.delete(id); else state.selection.add(id);
      renderSelectionInfo();
      render();
      return;
    }
    // during play phase allow selecting only from bottom hand
    const exists = state.players.bottom.hand.find(c=>c.id===id);
    if(!exists) return;
    if(state.selection.has(id)) state.selection.delete(id); else state.selection.add(id);
    renderSelectionInfo();
    render();
  }

  function renderSelectionInfo(){
    const info = document.getElementById("selectionInfo");
    info.textContent = `Select cards: ${state.selection.size}`;
  }

  // Game flow
  function newGame(){
    state.round = 1;
    state.teamScore = {1:0,2:0};
    for(const p of POSITIONS){ state.players[p].score = 0; state.players[p].level = 2; state.players[p].hand = []; }
    state.trickHistory = [];
    startRound(null);
  }

  function startRound(nextClaimer){
    state.deck = shuffle(makeDeck());
    for(const p of POSITIONS){ state.players[p].hand = []; }
    state.center = [];
    state.trump = { suit: null, source: null };
    state.claimer = nextClaimer || null; // determined in dealing by first show overwrite
    state.predValue = valueFromLevel(state.players[state.claimer||"bottom"].level || 2);
    state.leadPos = null;
    state.turnIndex = 0;
    state.trick = {};
    state.selection.clear();
    state.showPhase = true;
    state.claimedCenterThisRound = false;
    state.realJokersRound = isRealJokersRound();
    if(state.realJokersRound) state.trump.suit = "Jokers"; // only jokers as trumps

    render();
    dealWithShowPhase();
  }

  function isRealJokersRound(){
    // if claimer's level > 14 triggers; if no claimer yet, treat as false for first round
    const cl = state.claimer || "bottom";
    return state.players[cl].level > 14;
  }

  function valueFromLevel(level){
    // 2..14 mapping to VALUES
    const map = {11:"J",12:"Q",13:"K",14:"A"};
    if(level <= 10) return String(level);
    return map[level] || "A";
  }

  function setTimer(seconds, tickCb, endCb){
    clearInterval(state.timers.show); clearInterval(state.timers.turn);
    state.timers.seconds = seconds; if(el.timerLabel) el.timerLabel.textContent = `⏱ ${String(seconds).padStart(2,"0")}`;
    const id = setInterval(()=>{
      state.timers.seconds--;
      if(el.timerLabel) el.timerLabel.textContent = `⏱ ${String(Math.max(0,state.timers.seconds)).padStart(2,"0")}`;
      if(tickCb) tickCb(state.timers.seconds);
      if(state.timers.seconds <= 0){ clearInterval(id); if(endCb) endCb(); }
    }, 1000);
    return id;
  }

  function dealWithShowPhase(){
    // Deal 25 to each, 8 to center. Counter-clockwise starting from bottom: bottom -> right -> top -> left
    const order = ["bottom","right","top","left"]; // counter-clockwise from our perspective
    const TARGET_PER_PLAYER = 25;
    let dealtPerPlayer = {bottom:0,right:0,top:0,left:0};
    let i = 0;

    function dealOne(){
      // finish when all players have TARGET_PER_PLAYER
      if(Object.values(dealtPerPlayer).every(n=>n>=TARGET_PER_PLAYER)){
        // place center 8
        while(state.center.length < 8 && state.deck.length){ state.center.push(state.deck.pop()); }
        state.showPhase = true;
        // allow final 15s show window
        toast("Final 15s to Show for Trump/Claim", 1500);
        state.timers.show = setTimer(15, null, ()=>{ endShowPhase(); });
        render();
        return;
      }

      const pos = order[i % 4];
      const card = state.deck.pop();
      state.players[pos].hand.push(card);
      dealtPerPlayer[pos]++;

      // AI and human can decide to show immediately based on drawn card(s)
      considerShow(pos);

      render();

      i++;
      setTimeout(dealOne, 120); // smooth dealing
    }

    dealOne();
  }

  function considerShow(pos){
    // During dealing, players can show: single pred value; pair pred same suit; pair small jokers; pair big jokers
    // Overwrite priority: big_joker_pair > small_joker_pair > pred_value_pair > pred_value_single
    const hand = state.players[pos].hand;
    const pred = state.predValue;

    const findings = analyzeShowOptions(hand, pred);
    if(!findings.length) return;

    // AI: randomly decide to show with some probability based on strength
    if(pos !== "bottom"){
      const top = findings[0];
      const chance = top.priority >= 90 ? 0.9 : top.priority >= 70 ? 0.6 : 0.35;
      if(Math.random() < chance){ applyShow(pos, top); }
    } else {
      // For human, we wait for user to click Show button using selection; still we can suggest via toast
      toast("You can Show to set/overwrite trump. Use Show button.", 1000);
    }
  }

  function analyzeShowOptions(hand, pred){
    const res = [];
    // helper counts
    const bySuitVal = {};
    let smallJ = 0, bigJ = 0;
    for(const c of hand){
      if(isJoker(c)){
        if(c.value === "Small") smallJ++; else bigJ++;
      } else if(c.value === pred){
        const k = `${c.suit}-${c.value}`;
        bySuitVal[k] = (bySuitVal[k]||0)+1;
      }
    }
    if(bigJ >= 2) res.push({type:"big_joker_pair", priority: 100, trump:"Jokers", cards: takeN(hand, c=>isJoker(c)&&c.value==="Big", 2)});
    if(smallJ >= 2) res.push({type:"small_joker_pair", priority: 95, trump:"Jokers", cards: takeN(hand, c=>isJoker(c)&&c.value==="Small", 2)});
    for(const k of Object.keys(bySuitVal)){
      if(bySuitVal[k] >= 2){
        const suit = k.split('-')[0];
        res.push({type:"pred_value_pair", priority: 80, trump:suit, cards: takeN(hand, c=>c.suit===suit && c.value===pred, 2)});
      }
    }
    // singles
    for(const s of SUITS){
      const has = hand.find(c=>c.suit===s && c.value===pred);
      if(has){ res.push({type:"pred_value_single", priority: 70, trump:s, cards:[has]}); }
    }

    // sort by priority descending; first seen wins in tie by our rule, but we'll keep current trump if same priority seen earlier
    res.sort((a,b)=>b.priority - a.priority);
    return res;
  }

  function takeN(hand, pred, n){
    const out = []; for(const c of hand){ if(pred(c)){ out.push(c); if(out.length===n) break; }} return out;
  }

  function applyShow(pos, show){
    // Trump overwrite rule: highest priority overwrites current; if same, first-in-time wins (we skip tie overwrite)
    const cur = currentShowPriority();
    if(show.priority > cur){
      state.trump.suit = show.trump;
      state.claimer = state.claimer || pos; // first show establishes claimer if none
      // On first round only, final overwriter gains center claim; we'll resolve who is final after final window.
      log("Trump set to", state.trump.suit, "by", pos, show.type);
      render();
    }
  }

  function currentShowPriority(){
    if(!state.trump.suit) return -1;
    if(state.trump.suit === "Jokers") return 90; // could be big or small; treat as high
    // assume pred pair > single if trump set to suit without details; we approximate by 75
    return 75;
  }

  function endShowPhase(){
    state.showPhase = false;
    // First round: if claimer null, set to bottom by default
    if(!state.claimer) state.claimer = "bottom";
    // set predValue from claimer level
    state.predValue = valueFromLevel(state.players[state.claimer].level);

    // Mark trump styling by re-render
    render();

    // Claimer may view and swap center (first round only: final overwriter gains claim). For simplicity, allow claimer to claim in round 1 only.
    if(state.round === 1){
      toast(`${state.claimer} can view and swap 8 center cards.`, 1400);
      state.claimedCenterThisRound = true; // allow one-time view
    }

    // Lead starts at claimer
    state.leadPos = state.claimer;
    startTrick();
  }

  function startTrick(){
    state.trick = { bottom:[], left:[], top:[], right:[] };
    state.turnIndex = 0;
    el.trickPoints.textContent = `Pts: 0`;
    render();
    continueTurn();
  }

  function continueTurn(){
    const order = [state.leadPos, nextPos(state.leadPos), nextPos(nextPos(state.leadPos)), nextPos(nextPos(nextPos(state.leadPos)))];
    const pos = order[state.turnIndex];
    if(el.turnLabel) el.turnLabel.textContent = `Turn: ${pos}`;

    if(pos === "bottom"){
      // Human: wait for Confirm Play
      setTimer(30, null, ()=>{
        // auto-play weakest legal if timeout
        const move = chooseAiMove(pos);
        applyPlay(pos, move);
      });
      // enable confirm button
      if(el.btnConfirmPlay) el.btnConfirmPlay.disabled = false;
    } else {
      // AI:
      setTimer(2, null, ()=>{
        const move = chooseAiMove(pos);
        applyPlay(pos, move);
      });
    }
  }

  function nextPos(p){
    const idx = POSITIONS.indexOf(p);
    return POSITIONS[(idx+1)%4];
  }

  function cardsFromSelection(){
    const ids = new Set(state.selection);
    const hand = state.players.bottom.hand;
    return hand.filter(c=>ids.has(c.id));
  }

  // Validate moves based on trick lead
  function leadTypeAndSuit(){
    const leadCards = state.trick[state.leadPos] || [];
    if(!leadCards.length) return { type:null, suit:null, count:0 };
    const type = detectComboType(leadCards);
    const suit = leadSuit(leadCards);
    return { type, suit, count: leadCards.length };
  }

  function detectComboType(cards){
    if(cards.length === 1) return COMBO.SINGLE;
    if(cards.length === 2 && sameSuit(cards) && sameValue(cards)) return COMBO.PAIR;
    if(cards.length === 4 && isConsecutivePairs(cards)) return COMBO.CONSEC;
    // fallback: treat as same count single type to enforce count-following
    return COMBO.SINGLE;
  }

  function sameSuit(cards){ return cards.every(c=>c.suit===cards[0].suit); }
  function sameValue(cards){ return cards.every(c=>c.value===cards[0].value); }

  function isConsecutivePairs(cards){
    if(!sameSuit(cards)) return false;
    // group by value
    const byVal = {};
    for(const c of cards){ byVal[c.value]=(byVal[c.value]||0)+1; }
    const vals = Object.keys(byVal);
    if(vals.length !== 2) return false;
    if(byVal[vals[0]] !== 2 || byVal[vals[1]] !== 2) return false;
    // check consecutive by overall rank ignoring pred holes
    const r1 = naturalRank(vals[0]);
    const r2 = naturalRank(vals[1]);
    return Math.abs(r1 - r2) === 1;
  }

  function naturalRank(v){ return valueOrder[v] || 0; }

  function leadSuit(cards){
    // Determine suit: if trump in lead, lead suit is trump; else suit of first non-trump
    // We define lead suit as suit of first card unless trump chosen; special handling for jokers considered trump.
    const first = cards[0];
    if(isTrump(first)) return "TRUMP";
    return first.suit;
  }

  function isValidFollow(pos, cards){
    const { type, suit, count } = leadTypeAndSuit();
    const sameCount = cards.length === count;
    if(!sameCount) return false;

    const ctype = detectComboType(cards);
    if(type === COMBO.CONSEC){ if(ctype !== COMBO.CONSEC) return false; }
    if(type === COMBO.PAIR){ if(ctype !== COMBO.PAIR) return false; }

    if(suit === "TRUMP"){
      // must play trump if able to follow trump
      const hasTrump = state.players[pos].hand.some(isTrump);
      if(hasTrump && !cards.every(isTrump)) return false;
    } else {
      // must follow suit if possible (non-trump lead suit)
      const hasSuit = state.players[pos].hand.some(c=>!isTrump(c) && c.suit===suit);
      if(hasSuit && !cards.every(c=>!isTrump(c) && c.suit===suit)) return false;
      // if cannot follow suit, can play trump or others
    }

    return true;
  }

  function winningComparator(leadCards){
    const leadS = leadSuit(leadCards);
    const type = detectComboType(leadCards);
    return (a,b)=>{
      // Only called when types and counts are matched or trump rules applied
      const aTrump = a.every(isTrump);
      const bTrump = b.every(isTrump);
      if(aTrump && !bTrump) return 1;
      if(!aTrump && bTrump) return -1;
      if(!aTrump && !bTrump){
        if(leadS !== "TRUMP"){ // compare within lead suit
          const aLead = a.every(c=>!isTrump(c) && c.suit===leadS);
          const bLead = b.every(c=>!isTrump(c) && c.suit===leadS);
          if(aLead && !bLead) return 1; if(!aLead && bLead) return -1;
        }
      }
      // compare by highest rank within combo
      const ar = Math.max(...a.map(cardRank));
      const br = Math.max(...b.map(cardRank));
      return ar - br;
    };
  }

  function trickPoints(cards){
    let pts = 0;
    for(const c of cards){ if(!isJoker(c)) { if(c.value === "5") pts += 5; if(c.value === "10" || c.value === "K") pts += 10; } }
    return pts;
  }

  function applyPlay(pos, move){
    if(!move || !move.cards || move.cards.length===0){
      // pick lowest single from hand as fallback
      const h = state.players[pos].hand.slice().sort((a,b)=>cardRank(a)-cardRank(b));
      move = { type: COMBO.SINGLE, cards: [h[0]] };
    }

    // remove from hand
    const hand = state.players[pos].hand;
    move.cards.forEach(c=>{ const idx = hand.findIndex(x=>x.id===c.id); if(idx>=0) hand.splice(idx,1); });

    state.trick[pos] = move.cards;
    render();

    state.turnIndex++;
    if(state.turnIndex >= 4){
      // resolve trick
      resolveTrick();
    } else {
      continueTurn();
    }
  }

  function resolveTrick(){
    const order = [state.leadPos, nextPos(state.leadPos), nextPos(nextPos(state.leadPos)), nextPos(nextPos(nextPos(state.leadPos)))];
    const plays = order.map(p=>({pos:p, cards: state.trick[p]||[]}));
    const comp = winningComparator(state.trick[state.leadPos]);
    let winner = plays[0];
    for(let i=1;i<plays.length;i++){
      if(comp(plays[i].cards, winner.cards) > 0) winner = plays[i];
    }

    // scoring (off-run team only gains points of trick when they win)
    const totalCards = plays.flatMap(p=>p.cards);
    const pts = trickPoints(totalCards);
    el.trickPoints.textContent = `Pts: ${pts}`;

    const onRunTeam = state.players[state.claimer].team;
    const winningTeam = state.players[winner.pos].team;
    if(winningTeam !== onRunTeam){
      // off-run gains
      for(const p of POSITIONS){ if(state.players[p].team === winningTeam) state.players[p].score += pts; }
    }

    toast(`${winner.pos} wins the trick${pts?` (+${pts})`:''}`);
    state.trickHistory.push({ winner: winner.pos, plays: clone(plays), points: pts });

    // winner leads next
    state.leadPos = winner.pos;
    state.turnIndex = 0;
    state.trick = { bottom:[], left:[], top:[], right:[] };
    render();

    // check end of round (all hands empty)
    const anyCards = POSITIONS.some(p=>state.players[p].hand.length>0);
    if(!anyCards){
      endRound();
      return;
    }

    // continue
    setTimeout(continueTurn, 600);
  }

  function endRound(){
    // Sum team off-run points
    const onRunTeam = state.players[state.claimer].team;
    const offRunTeam = onRunTeam === 1 ? 2 : 1;
    const offPoints = POSITIONS.filter(p=>state.players[p].team===offRunTeam).reduce((a,p)=>a+state.players[p].score,0);

    let roundWinnerTeam = onRunTeam; // default on-run wins unless off-run > 80
    if(offPoints > 80) roundWinnerTeam = offRunTeam;

    // level progression
    if(roundWinnerTeam === onRunTeam){
      // On-run wins
      if(offPoints === 0){ adjustLevels(onRunTeam, +2); toast("Shutout! On-run +2 levels") }
      else if(offPoints < 40){ adjustLevels(onRunTeam, +1); toast("On-run +1 level") }
      else { /* no change */ }
    } else {
      // Off-run wins
      const inc = Math.floor((Math.max(0, offPoints - 80))/40);
      if(inc>0){ adjustLevels(offRunTeam, inc); toast(`Off-run +${inc} level(s)`) }
    }

    // Team score across rounds: winner gets 1 pt (for display)
    state.teamScore[roundWinnerTeam] += 1;

    // Next claimer
    let nextClaimer;
    if(roundWinnerTeam === onRunTeam){
      // next claimer = current claimer's teammate
      nextClaimer = teammateOf(state.claimer);
    } else {
      // next claimer = clockwise adjacent from current claimer
      nextClaimer = nextPos(state.claimer);
    }

    // Check real jokers global win
    if(state.realJokersRound && roundWinnerTeam === onRunTeam){
      // game ends with celebration
      showCelebration();
      return;
    }

    // prepare next round
    state.round += 1;
    // reset per-player round trick points
    for(const p of POSITIONS){ state.players[p].score = 0; }
    startRound(nextClaimer);
  }

  function adjustLevels(team, delta){
    for(const p of POSITIONS){ if(state.players[p].team===team) state.players[p].level += delta; }
  }

  function teammateOf(pos){
    return pos === "bottom" ? "top" : pos === "top" ? "bottom" : pos === "left" ? "right" : "left";
  }

  // AI
  function chooseAiMove(pos){
    const hand = state.players[pos].hand;
    const legal = generateLegalMoves(pos, hand);
    if(!legal.length){ return { type:COMBO.SINGLE, cards:[hand[0]] }; }
    // score moves
    legal.forEach(m=> m.strength = evalMoveStrength(m));
    legal.sort((a,b)=>b.strength-a.strength);
    const half = Math.max(1, Math.ceil(legal.length/2));
    const pick = legal[Math.floor(Math.random()*half)];
    return pick;
  }

  function generateLegalMoves(pos, hand){
    const { type, suit, count } = leadTypeAndSuit();
    const moves = [];

    function pushMove(cards){ moves.push({ type: detectComboType(cards), cards }); }

    const singles = hand.map(c=>[c]);
    const pairs = [];
    const bySuitVal = {};
    for(const c of hand){ const k=`${c.suit}-${c.value}`; (bySuitVal[k]=bySuitVal[k]||[]).push(c); }
    for(const k of Object.keys(bySuitVal)){ if(bySuitVal[k].length>=2) pairs.push(bySuitVal[k].slice(0,2)); }

    const consec = [];
    for(const s of SUITS){
      const cardsS = hand.filter(c=>c.suit===s);
      const vals = [...new Set(cardsS.map(c=>c.value))].sort((a,b)=>naturalRank(a)-naturalRank(b));
      for(let i=0;i<vals.length-1;i++){
        const v1 = vals[i], v2 = vals[i+1];
        if(Math.abs(naturalRank(v1)-naturalRank(v2))===1){
          const p1 = cardsS.filter(c=>c.value===v1).slice(0,2);
          const p2 = cardsS.filter(c=>c.value===v2).slice(0,2);
          if(p1.length===2 && p2.length===2){ consec.push([...p1,...p2]); }
        }
      }
    }

    if(!type){ // leading options: can play any
      singles.forEach(pushMove); pairs.forEach(pushMove); consec.forEach(pushMove);
    } else {
      // must follow
      const candidates = (type===COMBO.SINGLE?singles:(type===COMBO.PAIR?pairs:consec));
      for(const cs of candidates){ if(isValidFollow(pos, cs)) pushMove(cs); }
      if(!moves.length){ // if cannot follow, allow any same count
        const sameCount = handCombinationsOfCount(hand, count);
        for(const cs of sameCount){ if(isValidFollow(pos, cs)) pushMove(cs); }
      }
    }

    // Fallback: ensure at least one move
    if(!moves.length && hand.length){ moves.push({ type:COMBO.SINGLE, cards:[hand[0]] }); }
    return dedupeMoves(moves);
  }

  function dedupeMoves(moves){
    const seen = new Set();
    const out = [];
    for(const m of moves){
      const key = m.cards.map(c=>c.id).sort().join('|');
      if(!seen.has(key)){ seen.add(key); out.push(m); }
    }
    return out;
  }

  function handCombinationsOfCount(hand, n){
    const res=[]; const a=hand;
    function rec(start, pick){ if(pick.length===n){ res.push(pick.slice()); return; } for(let i=start;i<a.length;i++){ pick.push(a[i]); rec(i+1,pick); pick.pop(); } }
    rec(0,[]); return res;
  }

  function evalMoveStrength(m){
    // heuristic: prefer matching type/suit, trumps late unless needed, sum of ranks
    const sum = m.cards.reduce((s,c)=>s+cardRank(c),0);
    // small bonus by type
    const typeBonus = m.type===COMBO.CONSEC?40: m.type===COMBO.PAIR?20:0;
    return sum + typeBonus;
  }

  // Button handlers
  if(el.btnNew) el.btnNew.addEventListener('click', ()=>{ newGame(); });
  if(el.btnDeal) el.btnDeal.addEventListener('click', ()=>{ startRound(state.claimer); });

  if(el.btnShow) el.btnShow.addEventListener('click', ()=>{
    if(!state.showPhase){ toast('Show phase is over.'); return; }
    // consider selected cards for human
    const sel = cardsFromSelection();
    if(!sel.length){ toast('Select card(s) to Show.'); return; }
    const opt = interpretSelectionAsShow(sel);
    if(!opt){ toast('Selection not a valid Show.'); return; }
    applyShow('bottom', opt);
  });

  function interpretSelectionAsShow(sel){
    const pred = state.predValue;
    // Big pair
    if(sel.length===2 && sel.every(c=>isJoker(c) && c.value==='Big')) return {type:'big_joker_pair', priority:100, trump:'Jokers', cards:sel};
    if(sel.length===2 && sel.every(c=>isJoker(c) && c.value==='Small')) return {type:'small_joker_pair', priority:95, trump:'Jokers', cards:sel};
    if(sel.length===2 && sel.every(c=>c.value===pred && c.suit!=="Jokers") && sel[0].suit===sel[1].suit) return {type:'pred_value_pair', priority:80, trump:sel[0].suit, cards:sel};
    if(sel.length===1 && sel[0].value===pred && sel[0].suit!=="Jokers") return {type:'pred_value_single', priority:70, trump:sel[0].suit, cards:sel};
    return null;
  }

  if(el.btnCenter) el.btnCenter.addEventListener('click', ()=>{
    if(!state.claimedCenterThisRound){ toast('No center claim available.'); return; }
    // Simple center swap: take highest 8, return 8 lowest (auto for AI/human for now)
    const pos = state.claimer;
    const h = state.players[pos].hand;
    const all = h.concat(state.center);
    // choose 8 best to keep based on rank
    all.sort((a,b)=>cardRank(b)-cardRank(a));
    const keep = all.slice(0, h.length); // keep hand size same (13)
    const back = all.slice(h.length, h.length+8);
    state.players[pos].hand = keep;
    state.center = back;
    state.claimedCenterThisRound = false;
    render();
  });

  if(el.btnConfirmPlay) el.btnConfirmPlay.addEventListener('click', ()=>{
    const pos = 'bottom';
    const sel = cardsFromSelection();
    if(state.turnIndex===0 && pos===state.leadPos){
      const t = detectComboType(sel);
      if(!sel.length || (t!==COMBO.SINGLE && t!==COMBO.PAIR && t!==COMBO.CONSEC)){
        toast('Lead must be Single/Pair/Consecutive Pairs.'); return;
      }
    } else {
      if(!isValidFollow(pos, sel)){ toast('Invalid follow.'); return; }
    }

    el.btnConfirmPlay.disabled = true;
    applyPlay(pos, { type: detectComboType(sel), cards: sel });
    state.selection.clear(); renderSelectionInfo(); render();
  });

  if(el.btnRestart) el.btnRestart.addEventListener('click', ()=>{ newGame(); });
  if(el.debugToggle) el.debugToggle.addEventListener('change', (e)=>{ state.debug = e.target.checked; });

  // Celebration
  function showCelebration(){
    el.celebration.classList.add('active');
    setTimeout(()=>{ el.celebration.classList.remove('active'); newGame(); }, 5000);
  }

  // Init
  function init(){
    state.debug = false;
    renderSelectionInfo();
    render();
  }

  init();
})();
