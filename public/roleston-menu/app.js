const speakerIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9v6h4l5 4V5L7 9H3zm12.5 3a3.5 3.5 0 0 0-2-3.15v6.3A3.5 3.5 0 0 0 15.5 12zM13.5 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>
  </svg>`;

const menuSections = [
  {
    id: "fish-and-chips",
    label: "FISH & CHIPS",
    title: "Fish & Chips",
    image: "images/fish-and-chips.jpg",
    alt: "Battered fish with chips, tartar sauce and lemon",
    items: [
      ["F", "Fish (Battered Only)", "$4.90", "Battered fish"],
      ["C", "Chips", "$4.90"],
      ["½C", "Half Scoop Chips", "$3.90"],
      ["H", "Hot Dog", "$4.30"],
      ["S", "Sausage", "$4.30"],
      ["P", "Meat Patty", "$4.50"],
      ["D", "Donut (Plain / Choc / Jam)", "$4.50", "Donut, plain, chocolate, or jam"],
      ["PF", "Potato Fritter", "$2.50"],
      ["PR", "Pineapple Ring", "$4.30"],
      ["CS", "Crabstick", "$4.30", "Crab stick"],
      ["BF", "Banana Fritter", "$4.30"],
      ["KF", "Chicken Fillet", "$6.50"],
      ["CR", "Curry Rice Roll", "$5.60"],
      ["SR", "Spring Roll", "$5.60"],
      ["SOR", "Steak & Onion Roll", "$5.60", "Steak and onion roll"],
      ["Pa", "Paua Fritter", "$4.90", "Pāua fritter"],
      ["COF", "Cheese & Onion Fritter", "$4.90", "Cheese and onion fritter"],
      ["CF", "Corn Fritter", "$4.90"],
      ["CN", "Chicken Nuggets (½ doz)", "$7.50", "Chicken nuggets, half a dozen"],
      ["CON", "Corn Nuggets (½ doz)", "$7.50", "Corn nuggets, half a dozen"],
      ["SQ / OR", "Squid Rings / Onion Rings (½ doz)", "$7.50", "Squid rings or onion rings, half a dozen"],
      ["M", "Mussels (½ doz)", "$10.50", "Mussels, half a dozen"],
      ["SL", "Scallops (½ doz)", "$16.00", "Scallops, half a dozen"],
      ["FB", "Fish Bites (four)", "$4.30", "Four fish bites"],
      ["W / KM", "Wedges / Kumara Chips (400g)", "$8.00", "Wedges or kumara chips, four hundred grams"],
      ["½K+C", "Half-a-Chicken & Chips", "$20.00", "Half a chicken and chips"],
      ["BK", "Beef Kebab", "$5.60"],
      ["KB", "Chicken Kebab", "$5.60"],
      ["HB", "Hash Browns (four)", "$5.60", "Four hash browns"],
      ["MOR", "Deep Fried Moro Bar", "$4.90"],
      ["6WT", "Wontons (½ doz)", "$9.00", "Wontons, half a dozen"],
      ["12WT", "Wontons (1 doz)", "$16.00", "Wontons, one dozen"],
      ["6MSR", "Mini Spring Rolls (½ doz)", "$4.50", "Mini spring rolls, half a dozen"]
    ]
  },
  {
    id: "burgers",
    label: "BURGERS",
    title: "Burgers",
    image: "images/burger.jpg",
    alt: "Cheeseburger with chips",
    items: [
      ["X", "Beef (Plain)", "$6.80", "Plain beef burger"],
      ["C", "Cheese", "$7.80", "Cheese burger"],
      ["T", "Tomato", "$7.80", "Tomato burger"],
      ["P", "Pineapple", "$7.80", "Pineapple burger"],
      ["E", "Egg", "$7.80", "Egg burger"],
      ["b", "Beetroot", "$7.80", "Beetroot burger"],
      ["W", "Chow Chow", "$7.80", "Chow chow burger"],
      ["B", "Bacon", "$7.80", "Bacon burger"],
      ["M", "Mushroom", "$7.80", "Mushroom burger"],
      ["S", "Steak", "$10.00", "Steak burger"],
      ["K", "Chicken", "$7.80", "Chicken burger"],
      ["XM", "Double Meat", "$7.80", "Double meat burger"],
      ["CP", "Cheese & Pineapple", "$9.20", "Cheese and pineapple burger"],
      ["BE", "Bacon & Egg", "$9.20", "Bacon and egg burger"],
      ["SE", "Steak & Egg", "$12.00", "Steak and egg burger"],
      ["Veg", "Vegetarian", "$9.40", "Vegetarian burger"],
      ["H", "Hawaiian", "$10.60", "Hawaiian burger"],
      ["F", "Fish", "$8.80", "Fish burger"],
      ["G", "Giant", "$12.80", "Giant burger, with double meat, pineapple, bacon, egg, cheese, and tomato"]
    ],
    detailCards: [
      { title: "Trim", text: "Lettuce and onion" },
      { title: "Extras", text: "Pineapple, bacon or egg — $2.50 · Cheese or chow chow — $2.50 · Mushroom or meat — $2.50 · Steak or chicken — $5.50" }
    ]
  },
  {
    id: "sandwiches",
    label: "TOASTED SANDWICHES",
    title: "Toasted Sandwiches",
    image: "images/toasted-sandwich.jpg",
    alt: "Golden toasted ham, cheese and tomato sandwich",
    items: [
      ["C", "Cheese", "$5.20", "Cheese toasted sandwich"],
      ["T", "Tomato", "$5.20", "Tomato toasted sandwich"],
      ["E", "Egg", "$5.20", "Egg toasted sandwich"],
      ["B", "Bacon", "$5.20", "Bacon toasted sandwich"],
      ["P", "Pineapple", "$5.20", "Pineapple toasted sandwich"],
      ["b", "Beetroot", "$5.20", "Beetroot toasted sandwich"],
      ["M", "Mushroom", "$5.20", "Mushroom toasted sandwich"],
      ["H", "Ham", "$5.20", "Ham toasted sandwich"],
      ["CM", "Cheese & Mushroom", "$6.80", "Cheese and mushroom toasted sandwich"],
      ["S", "Steak", "$7.50", "Steak toasted sandwich"],
      ["CO", "Cheese & Onion", "$6.80", "Cheese and onion toasted sandwich"],
      ["BE", "Bacon & Egg", "$6.80", "Bacon and egg toasted sandwich"],
      ["CP", "Cheese & Pineapple", "$6.80", "Cheese and pineapple toasted sandwich"],
      ["HC", "Ham & Cheese", "$6.80", "Ham and cheese toasted sandwich"],
      ["SE", "Steak & Egg", "$8.90", "Steak and egg toasted sandwich"],
      ["HP", "Ham & Pineapple", "$6.80", "Ham and pineapple toasted sandwich"],
      ["SC", "Steak & Cheese", "$8.90", "Steak and cheese toasted sandwich"]
    ]
  },
  {
    id: "seafood",
    label: "CRUMBED OR BATTERED FISH",
    title: "Seafood",
    image: "images/seafood.jpg",
    alt: "Crumbed fish fillets, squid rings and scallops in a seafood basket",
    items: [
      ["SF / BC", "Sole Fillet / Blue Cod", "$14.00", "Sole fillet or blue cod"],
      ["AC / TK", "Akaroa Cod / Tarakihi", "$10.50", "Akaroa cod or tarakihi"],
      ["HK", "Hoki", "$9.90"]
    ]
  },
  {
    id: "packs",
    label: "FAMILY SPECIAL PACKS",
    title: "Family Packs",
    image: "images/family-pack.jpg",
    alt: "Family fish and chips pack in an open takeaway box",
    packs: [
      { code: "31 PK", price: "$31.00", items: ["2 Fish", "2 Hot Dogs", "2 Potato Fritters", "2 Chips"] },
      { code: "42 PK", price: "$42.00", items: ["4 Fish", "3 Hot Dogs", "2 Chips", "1 Potato Fritter"] },
      { code: "53 PK", price: "$53.00", items: ["5 Fish", "2 Hot Dogs", "2 Crabsticks", "3 Chips"] }
    ]
  }
];

function itemMarkup([code, name, price, spoken], itemId) {
  const phrase = spoken || name.replaceAll("&", "and");
  return `
    <li class="menu-item">
      <div class="item-copy">
        <div class="item-title"><span class="menu-code">${code}</span><span class="item-name">${name}</span></div>
        <div class="item-meta"><span class="item-price">${price}</span></div>
      </div>
      <button class="listen-button" type="button" data-audio-id="${itemId}" aria-label="Listen to ${phrase}">
        ${speakerIcon}
      </button>
    </li>`;
}

function menuSectionMarkup(section) {
  const content = section.packs
    ? `<div class="pack-list">${section.packs.map((pack, index) => `
        <article class="pack">
          <button class="listen-button pack-listen" type="button" data-audio-id="packs-${index + 1}" aria-label="Listen to family special pack ${index + 1}">${speakerIcon}</button>
          <div class="pack-heading"><span class="menu-code pack-code">${pack.code}</span><span class="pack-price">${pack.price} Pack</span></div>
          <ul>${pack.items.map((item) => `<li>${item}</li>`).join("")}</ul>
        </article>`).join("")}</div>`
    : `<ul class="menu-list">${section.items.map((item, index) => itemMarkup(item, `${section.id}-${index + 1}`)).join("")}</ul>`;
  const details = section.detailCards
    ? `<div class="detail-grid">${section.detailCards.map((detail) => `
        <article class="detail-card"><h4>${detail.title}</h4><p>${detail.text}</p></article>`).join("")}</div>`
    : "";
  const count = section.items ? `${section.items.length} ITEMS` : "3 PACKS";
  return `
    <article id="${section.id}" class="menu-section">
      <div class="section-photo">
        <img src="${section.image}" alt="${section.alt}" loading="lazy">
        <p class="section-label">${section.label}</p>
      </div>
      <div class="section-content">
        <div class="section-title-row">
          <h3>${section.title}</h3>
          <span class="section-count">${count}</span>
        </div>
        ${content}
        ${details}
      </div>
    </article>`;
}

const menuRoot = document.getElementById("menu-sections");
menuRoot.innerHTML = menuSections.map(menuSectionMarkup).join("");

let activeButton = null;
let activeAudio = null;
const audioStatus = document.getElementById("audio-status");

function setAudioStatus(message) {
  if (audioStatus) audioStatus.textContent = message;
}

function finishPlayback(audio) {
  if (activeAudio !== audio) return;
  activeButton?.classList.remove("is-playing");
  activeButton = null;
  activeAudio = null;
}

function stopPlayback() {
  const audio = activeAudio;
  activeButton?.classList.remove("is-playing");
  activeButton = null;
  activeAudio = null;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
}

function playServerAudio(itemId, button) {
  if (activeButton === button) {
    stopPlayback();
    setAudioStatus("Audio stopped.");
    return;
  }

  stopPlayback();
  const audio = new Audio(`/api/audio/menu-tts/${encodeURIComponent(itemId)}`);
  activeAudio = audio;
  activeButton = button;
  button.classList.add("is-playing");
  setAudioStatus("Loading the server voice…");

  audio.addEventListener("playing", () => {
    if (activeAudio === audio) setAudioStatus("Playing the server voice.");
  });
  audio.addEventListener("ended", () => {
    if (activeAudio !== audio) return;
    finishPlayback(audio);
    setAudioStatus("");
  });
  audio.addEventListener("error", () => {
    if (activeAudio !== audio) return;
    finishPlayback(audio);
    setAudioStatus("The server voice is unavailable. Please try again.");
  });

  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(() => {
      if (activeAudio !== audio) return;
      finishPlayback(audio);
      setAudioStatus("The server voice is unavailable. Please try again.");
    });
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".listen-button");
  if (!button) return;
  playServerAudio(button.dataset.audioId, button);
});
