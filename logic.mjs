// Pure game logic; this file also runs directly in Node's test runner.
// Common answer words are deliberately separate from the much larger accepted-guess list.
const ANSWER_DATA = [
  "about above abuse actor acute adapt admit adopt adore adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alter amend among angel anger angle angry apart apple apply arena argue arise array aside asset audio audit avoid awake award aware",
  "badge badly baker basic basis batch beach beard beast begin being belly below bench berry birth black blame bland blank blast blaze bleed blend bless blind blink block bloom blown blues blunt board boast bonus boost booth bound brain brake brand brass brave bread break breed brick bride brief bring brisk broad broke brood brook broom brown brush build built bunch burst buyer",
  "cabin cable camel candy canoe cargo carry carve catch cause cease chain chair chalk champ chant chaos charm chart chase cheap cheat check cheek cheer chess chest chief child chill china choir choke chose chunk cider cigar civic civil claim clash class clean clear clerk click cliff climb cling clock close cloth cloud coach coast cocoa colon color comet comic coral couch could count court cover crack craft crane crash crate crave crawl crazy cream creek creep crime crisp crowd crown cruel crush curve cycle",
  "daily dairy dance datum dealt death debug decal delay delta demon dense depth diary digit diner dirty disco ditch diver dizzy dodge doing donor donut doubt dozen draft drain drama drank dream dress dried drill drink drive drone drove drown drunk dwell dying",
  "eager eagle early earth easel eight elbow elder elect elite email empty enemy enjoy enter entry equal equip error essay event every exact exalt excel exist extra",
  "fable faint fairy faith false fancy fatal fault favor feast fence ferry fetch fever fiber field fiery fifth fifty fight final first flame flash fleet flesh float flock flood floor flora flour fluid flush focus foggy force forge forth forty forum found frame frank fraud fresh fried front frost fruit funny",
  "giant given glass gleam glide globe gloom glory glove going goose gorge grace grade grain grand grant grape grasp grass grave great greed green greet grief grill grind gripe gross group grown guard guess guest guide guilt",
  "habit happy harsh haste hatch hated haunt haven heart heavy hedge hello hence heron hilly hinge hobby honey honor horse hotel house human humid humor hurry",
  "ideal image imply inbox index indie infer inner input issue ivory",
  "jelly jewel joint joker judge juice juicy jumbo jumpy",
  "karma kayak kneel knife knock known",
  "label labor laden laser later laugh layer learn lease least leave legal lemon level lever light limit linen liner liver local logic loose loser lower loyal lucky lunar lunch lying lyric",
  "magic major maker mango manor maple march marry match maybe mayor medal media mercy merge merit merry metal meter metro might miles mimic miner minor minus mixed model modem money month moral motor mount mouse mouth movie muddy music musty",
  "naive nasty naval nerve never newer night noble noise north notch novel nurse nylon",
  "oasis ocean offer often olive onion onset opera orbit order organ other ought outer owner ozone",
  "paddy paint panel panic paper party pasta patch pause peace peach pearl pedal penal penny phase phone photo piano piece pilot pinch pitch pixel pizza place plain plane plant plate plead pluck point polar porch power press price pride prime print prior prize probe proof proud prove pulse punch pupil puppy purse",
  "queen query quest queue quick quiet quilt quite quote",
  "radio raise rally ranch range rapid ratio reach react ready realm rebel refer reign relax relay renew repay reply reset resin retro rhyme rider ridge rifle right rigid rival river robot rocky roman rough round route royal rugby ruler rural",
  "sadly saint salad salon salsa salty sandy sauce scale scare scene scent scope score scout scrap screw scrub sense serve setup seven shade shake shall shame shape share shark sharp shave sheep sheer sheet shelf shell shift shine shiny shirt shock shoot shore short shout shown shrub shrug sight sigma silly since sixth sixty skate skill skirt skull slack slain slang slate slave sleek sleep slice slide slope small smart smash smell smile smoke snack snake sneak snowy solar solid solve sonic sorry sound south space spare spark speak speed spell spend spice spicy spike spine spite split spoil spoke sport spray squad stack staff stage stain stair stake stale stamp stand stare start state steak steam steel steep steer stern stick stiff still sting stock stole stone stood stool store storm story stout stove strap straw strip stuck study stuff style sugar suite sunny super sushi swear sweat sweep sweet swift swing sword",
  "table taken tales tango taste tasty teach teams tears teeth tempo thank their theme there these thick thief thigh thing think third those three throw thumb tiger tight timer tired title toast today token tonic tooth topic torch total touch tough towel tower toxic trace track trade trail train trait trash treat trend trial tribe trick tried troop trout truck truly trunk trust truth tulip twist",
  "ultra uncle under union unite unity until upper upset urban usage usual utter",
  "valid value vapor vault venue verse video vigor vinyl viola viral virus visit vital vivid vocal voice voter vowel",
  "wages wagon waist waste watch water weary weave wedge weird whale wheat wheel where which while white whole whose widow width witch woman women world worry worse worst worth would wound woven write wrong wrote",
  "yacht years yeast yield young youth yummy",
  "zebra zeros zesty zonal"
].join(" ");

export const ANSWERS = Object.freeze(
  [...new Set(ANSWER_DATA.split(/\s+/).filter(word => /^[a-z]{5}$/.test(word)))].sort()
);

export function scoreGuess(guess, answer) {
  const a = answer.toLowerCase();
  const g = guess.toLowerCase();
  if (!/^[a-z]{5}$/.test(a) || !/^[a-z]{5}$/.test(g)) {
    throw new Error("A guess and answer must contain five English letters.");
  }
  const result = Array(5).fill("absent");
  const remaining = new Map();
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) result[i] = "correct";
    else remaining.set(a[i], (remaining.get(a[i]) || 0) + 1);
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const left = remaining.get(g[i]) || 0;
    if (left > 0) {
      result[i] = "present";
      remaining.set(g[i], left - 1);
    }
  }
  return result;
}

export function nextAnswer(pool, remainingBag, previousAnswer = "", random = Math.random) {
  if (!pool.length) throw new Error("Answer pool cannot be empty.");
  const valid = new Set(pool);
  let bag = Array.isArray(remainingBag) ? remainingBag.filter(w => valid.has(w)) : [];
  if (!bag.length) {
    bag = [...pool];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag[bag.length - 1] === previousAnswer) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
  }
  return { answer: bag.pop(), bag };
}

export function emptyStats() {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] };
}

export function recordResult(stats, won, attempts = 6) {
  const distribution = [...stats.distribution];
  if (won) distribution[attempts - 1] += 1;
  const streak = won ? stats.streak + 1 : 0;
  return {
    played: stats.played + 1,
    wins: stats.wins + Number(won),
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    distribution
  };
}
