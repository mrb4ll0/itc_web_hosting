import { Company } from "../model/Company.js";
import { ITBaseCompanyCloud } from "../fireabase/ITBaseCompanyCloud.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
const it_base_companycloud = new ITBaseCompanyCloud();

function getNigerianIndustryDescription(industry) {
  if (!industry) return "Other";

  const industryLower = industry.toLowerCase().trim();

  // Comprehensive Nigerian industry mappings
  const industryMap = {
    // Technology & IT
    technology: "Technology & IT Services",
    tech: "Technology & IT Services",
    software: "Software Development",
    it: "Information Technology",
    "information technology": "Information Technology",
    programming: "Software Development",
    "web development": "Web Development & Design",
    "mobile development": "Mobile App Development",
    "data science": "Data Science & Analytics",
    ai: "Artificial Intelligence",
    "machine learning": "Machine Learning & AI",
    "cloud computing": "Cloud Computing Services",
    cybersecurity: "Cybersecurity",
    devops: "DevOps & Infrastructure",
    "ui/ux": "UI/UX Design",
    "digital marketing": "Digital Marketing",
    "e-commerce": "E-commerce & Online Retail",
    fintech: "Financial Technology",

    // Banking & Finance
    banking: "Banking & Financial Services",
    finance: "Financial Services",
    "financial services": "Financial Services",
    investment: "Investment Banking",
    insurance: "Insurance Services",
    microfinance: "Microfinance Banking",
    "asset management": "Asset Management",
    "wealth management": "Wealth Management",

    // Oil & Gas
    oil: "Oil & Gas",
    gas: "Oil & Gas",
    petroleum: "Petroleum & Energy",
    energy: "Energy Sector",
    "renewable energy": "Renewable Energy",
    power: "Power & Electricity",

    // Telecommunications
    telecom: "Telecommunications",
    telecommunication: "Telecommunications",
    mobile: "Mobile Telecommunications",
    isp: "Internet Service Provider",

    // Manufacturing
    manufacturing: "Manufacturing",
    fcmg: "Fast-Moving Consumer Goods",
    "consumer goods": "Consumer Goods",
    production: "Production & Manufacturing",
    automotive: "Automotive Industry",
    textile: "Textile & Apparel",

    // Healthcare
    healthcare: "Healthcare Services",
    health: "Healthcare",
    medical: "Medical Services",
    pharmaceutical: "Pharmaceuticals",
    hospital: "Hospital & Healthcare",

    // Education
    education: "Education Services",
    edtech: "Education Technology",
    training: "Training & Development",
    "e-learning": "E-Learning & EdTech",

    // Agriculture
    agriculture: "Agriculture & Agribusiness",
    agro: "Agribusiness",
    farming: "Farming & Agriculture",
    agritech: "Agricultural Technology",

    // Real Estate & Construction
    "real estate": "Real Estate",
    construction: "Construction",
    property: "Property Development",
    architecture: "Architecture & Design",

    // Logistics & Transportation
    logistics: "Logistics & Supply Chain",
    transportation: "Transportation",
    shipping: "Shipping & Logistics",
    "supply chain": "Supply Chain Management",

    // Media & Entertainment
    media: "Media & Entertainment",
    entertainment: "Entertainment",
    broadcasting: "Broadcasting",
    film: "Film & Television",
    music: "Music & Entertainment",

    // Professional Services
    consulting: "Consulting Services",
    legal: "Legal Services",
    accounting: "Accounting & Audit",
    audit: "Accounting & Audit",
    "human resources": "Human Resources",

    // Hospitality & Tourism
    hospitality: "Hospitality",
    tourism: "Tourism & Travel",
    hotel: "Hotel & Hospitality",
    travel: "Travel & Tourism",

    // Retail & Commerce
    retail: "Retail",
    commerce: "Commerce & Trade",
    wholesale: "Wholesale & Distribution",

    // NGO & Government
    ngo: "Non-Profit Organization",
    "non-profit": "Non-Profit Organization",
    government: "Government Agency",
    "public sector": "Public Sector",
  };

  // Direct match
  if (industryMap[industryLower]) {
    return industryMap[industryLower];
  }

  // Partial matches for more flexibility
  for (const [key, value] of Object.entries(industryMap)) {
    if (industryLower.includes(key)) {
      return value;
    }
  }

  // Common Nigerian company patterns
  if (industryLower.includes("bank")) return "Banking & Financial Services";
  if (industryLower.includes("tech")) return "Technology & IT Services";
  if (industryLower.includes("soft")) return "Software Development";
  if (industryLower.includes("fin")) return "Financial Services";
  if (industryLower.includes("oil") || industryLower.includes("petrol"))
    return "Oil & Gas";
  if (industryLower.includes("manuf")) return "Manufacturing";
  if (industryLower.includes("health") || industryLower.includes("medical"))
    return "Healthcare Services";
  if (industryLower.includes("educ")) return "Education Services";
  if (industryLower.includes("agric") || industryLower.includes("farm"))
    return "Agriculture & Agribusiness";
  if (industryLower.includes("real") || industryLower.includes("estate"))
    return "Real Estate";
  if (industryLower.includes("construct")) return "Construction";
  if (industryLower.includes("logistic")) return "Logistics & Supply Chain";
  if (industryLower.includes("media") || industryLower.includes("enter"))
    return "Media & Entertainment";

  return "Other";
}

function getAvatarInitials(fullName, imageUrl = null) {
  // If imageUrl exists and is valid, use it
  if (
    imageUrl &&
    imageUrl !== "../images/Avatar.jpg" &&
    imageUrl.trim() !== ""
  ) {
    return `url('${imageUrl}')`;
  }

  // If no valid image URL, generate initials from name
  if (!fullName || fullName.trim() === "") {
    return generateInitials("Unknown Student");
  }

  return generateInitials(fullName);
}

export function generateInitials(name) {
  // Remove extra spaces and split into words
  const words = name.trim().split(/\s+/);

  if (words.length === 0) return "??";

  // Get first letter of first word
  let initials = words[0].charAt(0).toUpperCase();

  // If there's a second word, get first letter of last word
  if (words.length > 1) {
    initials += words[words.length - 1].charAt(0).toUpperCase();
  }

  return initials;
}

export function createAvatarElement(fullName, imageUrl = null, size = 40) {
  const avatarStyle = getAvatarStyle(fullName, imageUrl);

  if (avatarStyle.includes("background-image")) {
    const urlMatch = avatarStyle.match(/background-image: url\('([^']+)'\)/);
    const imageSrc = urlMatch ? urlMatch[1] : "";

    // Create a clean initials avatar HTML string
    const initialsHtml = createInitialsAvatar(fullName, size)
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/"/g, "&quot;") // Escape double quotes
      .replace(/\n/g, "") // Remove newlines
      .replace(/\s+/g, " "); // Collapse multiple spaces

    return `<img 
      src="${imageSrc}" 
      alt="${fullName || "User"}" 
      class="rounded-full object-cover"
      style="width: ${size}px; height: ${size}px;"
      onerror="this.outerHTML = '${initialsHtml}';"
    >`;
  } else {
    return createInitialsAvatar(fullName, size);
  }
}

export function createInitialsAvatar(fullName, size = 40) {
  const initials = generateInitials(fullName);
  const colors = [
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-teal-500 to-teal-600",
  ];
  const colorIndex = fullName ? fullName.charCodeAt(0) % colors.length : 0;

  return `<div class="rounded-full bg-gradient-to-br ${
    colors[colorIndex]
  } text-white flex items-center justify-center font-semibold" 
          style="width: ${size}px; height: ${size}px; font-size: ${
    size * 0.4
  }px;">
    ${initials}
  </div>`;
}

// Simple version that just returns the initials for CSS background
export function getAvatarStyle(fullName, imageUrl = null) {
  // First, define the helper function inside
  function getAvatarInitials(fullName, imageUrl = null) {
    // If imageUrl exists and is valid, use it
    if (
      imageUrl &&
      imageUrl !== "../images/Avatar.jpg" &&
      imageUrl.trim() !== ""
    ) {
      return `url('${imageUrl}')`;
    }

    // If no valid image URL, generate initials from name
    if (!fullName || fullName.trim() === "") {
      return generateInitials("Unknown Student");
    }

    return generateInitials(fullName);
  }

  function generateInitials(name) {
    // Remove extra spaces and split into words
    const words = name.trim().split(/\s+/);

    if (words.length === 0) return "??";

    // Get first letter of first word
    let initials = words[0].charAt(0).toUpperCase();

    // If there's a second word, get first letter of last word
    if (words.length > 1) {
      initials += words[words.length - 1].charAt(0).toUpperCase();
    }

    return initials;
  }

  const avatar = getAvatarInitials(fullName, imageUrl);

  if (avatar.startsWith("url(")) {
    return `background-image: ${avatar}; background-size: cover; background-position: center;`;
  } else {
    // Generate a consistent color based on the name
    const colors = [
      "from-blue-500 to-blue-600",
      "from-green-500 to-green-600",
      "from-purple-500 to-purple-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
      "from-teal-500 to-teal-600",
    ];
    const colorIndex = fullName ? fullName.charCodeAt(0) % colors.length : 0;

    return `background: linear-gradient(135deg, ${colors[colorIndex]}); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;`;
  }
}
// Usage in your code:
//const imageUrl = getAvatarInitials(this.student.fullName, this.student.imageUrl);
//studentProfileImage.style.backgroundImage = imageUrl;

let nigeria = {
  abuja: {
    capital: "Abuja",
    lgas: [
      "Abaji",
      "Bwari",
      "Gwagwalada",
      "Kuje",
      "Kwali",
      "Municipal Area Council",
    ],
  },
  abia: {
    capital: "Umuahia",
    lgas: [
      "Aba North",
      "Aba South",
      "Arochukwu",
      "Bende",
      "Ikwuano",
      "Isiala Ngwa North",
      "Isiala Ngwa South",
      "Isuikwuato",
      "Obi Ngwa",
      "Ohafia",
      "Osisioma",
      "Ugwunagbo",
      "Ukwa East",
      "Ukwa West",
      "Umuahia North",
      "Umuahia South",
      "Umunneochi",
    ],
  },
  adamawa: {
    capital: "Yola",
    lgas: [
      "Demsa",
      "Fufure",
      "Ganye",
      "Gayuk",
      "Gombi",
      "Grie",
      "Hong",
      "Jada",
      "Lamurde",
      "Madagali",
      "Maiha",
      "Mayo Belwa",
      "Michika",
      "Mubi North",
      "Mubi South",
      "Numan",
      "Shelleng",
      "Song",
      "Toungo",
      "Yola North",
      "Yola South",
    ],
  },
  akwaIbom: {
    capital: "Uyo",
    lgas: [
      "Abak",
      "Eastern Obolo",
      "Eket",
      "Esit Eket",
      "Essien Udim",
      "Etim Ekpo",
      "Etinan",
      "Ibeno",
      "Ibesikpo Asutan",
      "Ibiono-Ibom",
      "Ika",
      "Ikono",
      "Ikot Abasi",
      "Ikot Ekpene",
      "Ini",
      "Itu",
      "Mbo",
      "Mkpat-Enin",
      "Nsit-Atai",
      "Nsit-Ibom",
      "Nsit-Ubium",
      "Obot Akara",
      "Okobo",
      "Onna",
      "Oron",
      "Udung-Uko",
      "Ukanafun",
      "Uruan",
      "Urue-Offong/Oruko",
      "Uyo",
    ],
  },
  anambra: {
    capital: "Awka",
    lgas: [
      "Aguata",
      "Anambra East",
      "Anambra West",
      "Anaocha",
      "Awka North",
      "Awka South",
      "Ayamelum",
      "Dunukofia",
      "Ekwusigo",
      "Idemili North",
      "Idemili South",
      "Ihiala",
      "Njikoka",
      "Nnewi North",
      "Nnewi South",
      "Ogbaru",
      "Onitsha North",
      "Onitsha South",
      "Orumba North",
      "Orumba South",
      "Oyi",
    ],
  },
  bauchi: {
    capital: "Bauchi",
    lgas: [
      "Alkaleri",
      "Bauchi",
      "Bogoro",
      "Damban",
      "Darazo",
      "Dass",
      "Gamawa",
      "Ganjuwa",
      "Giade",
      "Itas/Gadau",
      "Jama'are",
      "Katagum",
      "Kirfi",
      "Misau",
      "Ningi",
      "Shira",
      "Tafawa Balewa",
      "Toro",
      "Warji",
      "Zaki",
    ],
  },
  bayelsa: {
    capital: "Yenagoa",
    lgas: [
      "Brass",
      "Ekeremor",
      "Kolokuma/Opokuma",
      "Nembe",
      "Ogbia",
      "Sagbama",
      "Southern Ijaw",
      "Yenagoa",
    ],
  },
  benue: {
    capital: "Makurdi",
    lgas: [
      "Ado",
      "Agatu",
      "Apa",
      "Buruku",
      "Gboko",
      "Guma",
      "Gwer East",
      "Gwer West",
      "Katsina-Ala",
      "Konshisha",
      "Kwande",
      "Logo",
      "Makurdi",
      "Obi",
      "Ogbadibo",
      "Ohimini",
      "Oju",
      "Okpokwu",
      "Oturkpo",
      "Tarka",
      "Ukum",
      "Ushongo",
      "Vandeikya",
    ],
  },
  borno: {
    capital: "Maiduguri",
    lgas: [
      "Abadam",
      "Askira/Uba",
      "Bama",
      "Bayo",
      "Biu",
      "Chibok",
      "Damboa",
      "Dikwa",
      "Gubio",
      "Guzamala",
      "Gwoza",
      "Hawul",
      "Jere",
      "Kaga",
      "Kala/Balge",
      "Konduga",
      "Kukawa",
      "Kwaya Kusar",
      "Mafa",
      "Magumeri",
      "Maiduguri",
      "Marte",
      "Mobbar",
      "Monguno",
      "Ngala",
      "Nganzai",
      "Shani",
    ],
  },
  crossRiver: {
    capital: "Calabar",
    lgas: [
      "Abi",
      "Akamkpa",
      "Akpabuyo",
      "Bakassi",
      "Bekwarra",
      "Biase",
      "Boki",
      "Calabar Municipal",
      "Calabar South",
      "Etung",
      "Ikom",
      "Obanliku",
      "Obubra",
      "Obudu",
      "Odukpani",
      "Ogoja",
      "Yakuur",
      "Yala",
    ],
  },
  delta: {
    capital: "Asaba",
    lgas: [
      "Aniocha North",
      "Aniocha South",
      "Bomadi",
      "Burutu",
      "Ethiope East",
      "Ethiope West",
      "Ika North East",
      "Ika South",
      "Isoko North",
      "Isoko South",
      "Ndokwa East",
      "Ndokwa West",
      "Okpe",
      "Oshimili North",
      "Oshimili South",
      "Patani",
      "Sapele",
      "Udu",
      "Ughelli North",
      "Ughelli South",
      "Ukwuani",
      "Uvwie",
      "Warri North",
      "Warri South",
      "Warri South West",
    ],
  },
  ebonyi: {
    capital: "Abakaliki",
    lgas: [
      "Abakaliki",
      "Afikpo North",
      "Afikpo South",
      "Ebonyi",
      "Ezza North",
      "Ezza South",
      "Ikwo",
      "Ishielu",
      "Ivo",
      "Izzi",
      "Ohaozara",
      "Ohaukwu",
      "Onicha",
    ],
  },
  edo: {
    capital: "Benin City",
    lgas: [
      "Akoko-Edo",
      "Egor",
      "Esan Central",
      "Esan North-East",
      "Esan South-East",
      "Esan West",
      "Etsako Central",
      "Etsako East",
      "Etsako West",
      "Igueben",
      "Ikpoba Okha",
      "Orhionmwon",
      "Oredo",
      "Ovia North-East",
      "Ovia South-West",
      "Owan East",
      "Owan West",
      "Uhunmwonde",
    ],
  },
  ekiti: {
    capital: "Ado-Ekiti",
    lgas: [
      "Ado Ekiti",
      "Efon",
      "Ekiti East",
      "Ekiti South-West",
      "Ekiti West",
      "Emure",
      "Gbonyin",
      "Ido Osi",
      "Ijero",
      "Ikere",
      "Ikole",
      "Ilejemeje",
      "Irepodun/Ifelodun",
      "Ise/Orun",
      "Moba",
      "Oye",
    ],
  },
  enugu: {
    capital: "Enugu",
    lgas: [
      "Aninri",
      "Awgu",
      "Enugu East",
      "Enugu North",
      "Enugu South",
      "Ezeagu",
      "Igbo Etiti",
      "Igbo Eze North",
      "Igbo Eze South",
      "Isi Uzo",
      "Nkanu East",
      "Nkanu West",
      "Nsukka",
      "Oji River",
      "Udenu",
      "Udi",
      "Uzo Uwani",
    ],
  },
  gombe: {
    capital: "Gombe",
    lgas: [
      "Akko",
      "Balanga",
      "Billiri",
      "Dukku",
      "Funakaye",
      "Gombe",
      "Kaltungo",
      "Kwami",
      "Nafada",
      "Shongom",
      "Yamaltu/Deba",
    ],
  },
  imo: {
    capital: "Owerri",
    lgas: [
      "Aboh Mbaise",
      "Ahiazu Mbaise",
      "Ehime Mbano",
      "Ezinihitte",
      "Ideato North",
      "Ideato South",
      "Ihitte/Uboma",
      "Ikeduru",
      "Isiala Mbano",
      "Isu",
      "Mbaitoli",
      "Ngor Okpala",
      "Njaba",
      "Nkwerre",
      "Nwangele",
      "Obowo",
      "Oguta",
      "Ohaji/Egbema",
      "Okigwe",
      "Orlu",
      "Orsu",
      "Oru East",
      "Oru West",
      "Owerri Municipal",
      "Owerri North",
      "Owerri West",
      "Unuimo",
    ],
  },
  jigawa: {
    capital: "Dutse",
    lgas: [
      "Auyo",
      "Babura",
      "Biriniwa",
      "Birnin Kudu",
      "Buji",
      "Dutse",
      "Gagarawa",
      "Garki",
      "Gumel",
      "Guri",
      "Gwaram",
      "Gwiwa",
      "Hadejia",
      "Jahun",
      "Kafin Hausa",
      "Kazaure",
      "Kiri Kasama",
      "Kiyawa",
      "Kaugama",
      "Maigatari",
      "Malam Madori",
      "Miga",
      "Ringim",
      "Roni",
      "Sule Tankarkar",
      "Taura",
      "Yankwashi",
    ],
  },
  kaduna: {
    capital: "Kaduna",
    lgas: [
      "Birnin Gwari",
      "Chikun",
      "Giwa",
      "Igabi",
      "Ikara",
      "Jaba",
      "Jema'a",
      "Kachia",
      "Kaduna North",
      "Kaduna South",
      "Kagarko",
      "Kajuru",
      "Kaura",
      "Kauru",
      "Kubau",
      "Kudan",
      "Lere",
      "Makarfi",
      "Sabon Gari",
      "Sanga",
      "Soba",
      "Zangon Kataf",
      "Zaria",
    ],
  },
  kano: {
    capital: "Kano",
    lgas: [
      "Ajingi",
      "Albasu",
      "Bagwai",
      "Bebeji",
      "Bichi",
      "Bunkure",
      "Dala",
      "Dambatta",
      "Dawakin Kudu",
      "Dawakin Tofa",
      "Doguwa",
      "Fagge",
      "Gabasawa",
      "Garko",
      "Garun Mallam",
      "Gaya",
      "Gezawa",
      "Gwale",
      "Gwarzo",
      "Kabo",
      "Kano Municipal",
      "Karaye",
      "Kibiya",
      "Kiru",
      "Kumbotso",
      "Kunchi",
      "Kura",
      "Madobi",
      "Makoda",
      "Minjibir",
      "Nasarawa",
      "Rano",
      "Rimin Gado",
      "Rogo",
      "Shanono",
      "Sumaila",
      "Takai",
      "Tarauni",
      "Tofa",
      "Tsanyawa",
      "Tudun Wada",
      "Ungogo",
      "Warawa",
      "Wudil",
    ],
  },
  katsina: {
    capital: "Katsina",
    lgas: [
      "Bakori",
      "Batagarawa",
      "Batsari",
      "Baure",
      "Bindawa",
      "Charanchi",
      "Dandume",
      "Danja",
      "Dan Musa",
      "Daura",
      "Dutsi",
      "Dutsin Ma",
      "Faskari",
      "Funtua",
      "Ingawa",
      "Jibia",
      "Kafur",
      "Kaita",
      "Kankara",
      "Kankia",
      "Katsina",
      "Kurfi",
      "Kusada",
      "Mai'Adua",
      "Malumfashi",
      "Mani",
      "Mashi",
      "Matazu",
      "Musawa",
      "Rimi",
      "Sabuwa",
      "Safana",
      "Sandamu",
      "Zango",
    ],
  },
  kebbi: {
    capital: "Birnin Kebbi",
    lgas: [
      "Aleiro",
      "Arewa Dandi",
      "Argungu",
      "Augie",
      "Bagudo",
      "Birnin Kebbi",
      "Bunza",
      "Dandi",
      "Fakai",
      "Gwandu",
      "Jega",
      "Kalgo",
      "Koko/Besse",
      "Maiyama",
      "Ngaski",
      "Sakaba",
      "Shanga",
      "Suru",
      "Danko/Wasagu",
      "Yauri",
      "Zuru",
    ],
  },
  kogi: {
    capital: "Lokoja",
    lgas: [
      "Adavi",
      "Ajaokuta",
      "Ankpa",
      "Bassa",
      "Dekina",
      "Ibaji",
      "Idah",
      "Igalamela Odolu",
      "Ijumu",
      "Kabba/Bunu",
      "Kogi",
      "Lokoja",
      "Mopa Muro",
      "Ofu",
      "Ogori/Magongo",
      "Okehi",
      "Okene",
      "Olamaboro",
      "Omala",
      "Yagba East",
      "Yagba West",
    ],
  },
  kwara: {
    capital: "Ilorin",
    lgas: [
      "Asa",
      "Baruten",
      "Edu",
      "Ekiti",
      "Ifelodun",
      "Ilorin East",
      "Ilorin South",
      "Ilorin West",
      "Irepodun",
      "Isin",
      "Kaiama",
      "Moro",
      "Offa",
      "Oke Ero",
      "Oyun",
      "Pategi",
    ],
  },
  lagos: {
    capital: "Ikeja",
    lgas: [
      "Agege",
      "Ajeromi-Ifelodun",
      "Alimosho",
      "Amuwo-Odofin",
      "Apapa",
      "Badagry",
      "Epe",
      "Eti Osa",
      "Ibeju-Lekki",
      "Ifako-Ijaiye",
      "Ikeja",
      "Ikorodu",
      "Kosofe",
      "Lagos Island",
      "Lagos Mainland",
      "Mushin",
      "Ojo",
      "Oshodi-Isolo",
      "Shomolu",
      "Surulere",
    ],
  },
  nasarawa: {
    capital: "Lafia",
    lgas: [
      "Akwanga",
      "Awe",
      "Doma",
      "Karu",
      "Keana",
      "Keffi",
      "Kokona",
      "Lafia",
      "Nasarawa",
      "Nasarawa Egon",
      "Obi",
      "Toto",
      "Wamba",
    ],
  },
  niger: {
    capital: "Minna",
    lgas: [
      "Agaie",
      "Agwara",
      "Bida",
      "Borgu",
      "Bosso",
      "Chanchaga",
      "Edati",
      "Gbako",
      "Gurara",
      "Katcha",
      "Kontagora",
      "Lapai",
      "Lavun",
      "Magama",
      "Mariga",
      "Mashegu",
      "Mokwa",
      "Moya",
      "Paikoro",
      "Rafi",
      "Rijau",
      "Shiroro",
      "Suleja",
      "Tafa",
      "Wushishi",
    ],
  },
  ogun: {
    capital: "Abeokuta",
    lgas: [
      "Abeokuta North",
      "Abeokuta South",
      "Ado-Odo/Ota",
      "Egbado North",
      "Egbado South",
      "Ewekoro",
      "Ifo",
      "Ijebu East",
      "Ijebu North",
      "Ijebu North East",
      "Ijebu Ode",
      "Ikenne",
      "Imeko Afon",
      "Ipokia",
      "Obafemi Owode",
      "Odeda",
      "Odogbolu",
      "Ogun Waterside",
      "Remo North",
      "Sagamu",
      "Yewa North",
      "Yewa South",
    ],
  },
  ondo: {
    capital: "Akure",
    lgas: [
      "Akoko North-East",
      "Akoko North-West",
      "Akoko South-East",
      "Akoko South-West",
      "Akure North",
      "Akure South",
      "Ese Odo",
      "Idanre",
      "Ifedore",
      "Ilaje",
      "Ile Oluji/Okeigbo",
      "Irele",
      "Odigbo",
      "Okitipupa",
      "Ondo East",
      "Ondo West",
      "Ose",
      "Owo",
    ],
  },
  osun: {
    capital: "Osogbo",
    lgas: [
      "Aiyedade",
      "Aiyedire",
      "Atakunmosa East",
      "Atakunmosa West",
      "Boluwaduro",
      "Boripe",
      "Ede North",
      "Ede South",
      "Egbedore",
      "Ejigbo",
      "Ife Central",
      "Ife East",
      "Ife North",
      "Ife South",
      "Ifedayo",
      "Ifelodun",
      "Ila",
      "Ilesa East",
      "Ilesa West",
      "Irepodun",
      "Irewole",
      "Isokan",
      "Iwo",
      "Obokun",
      "Odo Otin",
      "Ola Oluwa",
      "Olorunda",
      "Oriade",
      "Orolu",
      "Osogbo",
    ],
  },
  oyo: {
    capital: "Ibadan",
    lgas: [
      "Afijio",
      "Akinyele",
      "Atiba",
      "Atisbo",
      "Egbeda",
      "Ibadan North",
      "Ibadan North-East",
      "Ibadan North-West",
      "Ibadan South-East",
      "Ibadan South-West",
      "Ibarapa Central",
      "Ibarapa East",
      "Ibarapa North",
      "Ido",
      "Irepo",
      "Iseyin",
      "Itesiwaju",
      "Iwajowa",
      "Kajola",
      "Lagelu",
      "Ogbomosho North",
      "Ogbomosho South",
      "Ogo Oluwa",
      "Olorunsogo",
      "Oluyole",
      "Ona Ara",
      "Orelope",
      "Ori Ire",
      "Oyo East",
      "Oyo West",
      "Saki East",
      "Saki West",
      "Surulere",
    ],
  },
  plateau: {
    capital: "Jos",
    lgas: [
      "Bokkos",
      "Barkin Ladi",
      "Bassa",
      "Jos East",
      "Jos North",
      "Jos South",
      "Kanam",
      "Kanke",
      "Langtang South",
      "Langtang North",
      "Mangu",
      "Mikang",
      "Pankshin",
      "Qua'an Pan",
      "Riyom",
      "Shendam",
      "Wase",
    ],
  },
  rivers: {
    capital: "Port Harcourt",
    lgas: [
      "Abua/Odual",
      "Ahoada East",
      "Ahoada West",
      "Akuku-Toru",
      "Andoni",
      "Asari-Toru",
      "Bonny",
      "Degema",
      "Eleme",
      "Emuoha",
      "Etche",
      "Gokana",
      "Ikwerre",
      "Khana",
      "Obio/Akpor",
      "Ogba/Egbema/Ndoni",
      "Ogu/Bolo",
      "Okrika",
      "Omuma",
      "Opobo/Nkoro",
      "Oyigbo",
      "Port Harcourt",
      "Tai",
    ],
  },
  sokoto: {
    capital: "Sokoto",
    lgas: [
      "Binji",
      "Bodinga",
      "Dange Shuni",
      "Gada",
      "Goronyo",
      "Gudu",
      "Gwadabawa",
      "Illela",
      "Isa",
      "Kebbe",
      "Kware",
      "Rabah",
      "Sabon Birni",
      "Shagari",
      "Silame",
      "Sokoto North",
      "Sokoto South",
      "Tambuwal",
      "Tangaza",
      "Tureta",
      "Wamako",
      "Wurno",
      "Yabo",
    ],
  },
  taraba: {
    capital: "Jalingo",
    lgas: [
      "Ardo Kola",
      "Bali",
      "Donga",
      "Gashaka",
      "Gassol",
      "Ibi",
      "Jalingo",
      "Karim Lamido",
      "Kumi",
      "Lau",
      "Sardauna",
      "Takum",
      "Ussa",
      "Wukari",
      "Yorro",
      "Zing",
    ],
  },
  yobe: {
    capital: "Damaturu",
    lgas: [
      "Bade",
      "Bursari",
      "Damaturu",
      "Fika",
      "Fune",
      "Geidam",
      "Gujba",
      "Gulani",
      "Jakusko",
      "Karasuwa",
      "Machina",
      "Nangere",
      "Nguru",
      "Potiskum",
      "Tarmuwa",
      "Yunusari",
      "Yusufari",
    ],
  },
  zamfara: {
    capital: "Gusau",
    lgas: [
      "Anka",
      "Bakura",
      "Birnin Magaji/Kiyaw",
      "Bukkuyum",
      "Bungudu",
      "Gummi",
      "Gusau",
      "Kaura Namoda",
      "Maradun",
      "Maru",
      "Shinkafi",
      "Talata Mafara",
      "Chafe",
      "Zurmi",
    ],
  },
};

// Usage examples:
//console.log(nigeria.lagos.capital); // "Ikeja"
//console.log(nigeria.lagos.lgas.length); // 20
//console.log(nigeria.kano.lgas); // Array of all Kano LGAs
//console.log(nigeria.abuja.lgas); // Array of Abuja area councils

// Function to get all states
function getNigerianStates() {
  return Object.keys(nigeria);
}

// Function to get LGAs by state
function getLGAsByState(stateName) {
  const state = nigeria[stateName.toLowerCase()];
  return state ? state.lgas : [];
}

// Function to get capital by state
function getCapitalByState(stateName) {
  const state = nigeria[stateName.toLowerCase()];
  return state ? state.capital : "";
}

export {
  getNigerianIndustryDescription,
  getAvatarInitials,
  getNigerianStates,
  getLGAsByState,
  getCapitalByState,
};

// Or export the nigeria object if needed
export { nigeria };

function isFormExist(it) {
  const compForm = it.company.forms;
  //console.log("compForm "+compForm.length);
  if (compForm && compForm.length != 0) {
    return true;
  }
  if (it.formUrl) {
    //console.log("it files "+it.formUrl.length);
  }
  if (it.formUrl && it.formUrl.length != 0) {
    return true;
  }
  return false;
}

export { isFormExist };

function generateShareableUrl(pagePath, itid, applicationId) {
  // Get current host and protocol
  let baseUrl = window.location.origin;
  
  // Check if we're in test environment
  const isTestEnvironment = window.location.hostname.includes('test') || 
                           window.location.hostname.includes('localhost') ||
                           window.location.hostname.includes('127.0.0.1') ||
                           window.location.hostname.includes(':3000') || // Common dev port
                           window.location.hostname.includes(':8080');   // Common dev port
  
  // Add /public for test environments
  if (isTestEnvironment) {
    // Check if baseUrl already ends with /public to avoid duplicates
    if (!baseUrl.endsWith('/public')) {
      baseUrl += '/public';
    }
  }
  
  // Construct the full URL with proper query parameters
  const fullUrl = `${baseUrl}${pagePath}?itid=${itid}&id=${applicationId}`;
  
  console.log('Generated URL:', fullUrl, 'Test environment:', isTestEnvironment);
  return fullUrl;
}
export { generateShareableUrl };

// Track object URLs for cleanup
let objectURLs = [];
let escapeHandler = null;

/**
 * Show file in a dialog/modal for secure viewing
 * @param {string|File} file - File URL or File object
 * @param {string} fileType - Type of file ('image', 'pdf', 'document')
 * @param {string} fileName - Name of the file for display
 */
export function showFileDialog(
  file,
  fileType = "image",
  fileName = "Document"
) {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className =
    "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
  modalOverlay.id = "file-viewer-modal";

  // Create modal content
  const modalContent = document.createElement("div");
  modalContent.className =
    "bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col";

  // Create header
  const header = document.createElement("div");
  header.className =
    "flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700";

  const title = document.createElement("h3");
  title.className = "text-lg font-semibold text-slate-900 dark:text-white";
  title.textContent = fileName;

  const closeButton = document.createElement("button");
  closeButton.className =
    "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1";
  closeButton.innerHTML =
    '<span class="material-symbols-outlined">close</span>';
  closeButton.onclick = () => closeFileDialog();

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create content area
  const contentArea = document.createElement("div");
  contentArea.className = "flex-1 overflow-auto p-4";

  // Handle different file types
  let fileContent;
  let objectURL = null;

  if (fileType === "image") {
    fileContent = document.createElement("img");
    fileContent.className =
      "max-w-full h-auto mx-auto max-h-[70vh] object-contain";
    fileContent.alt = fileName;

    if (typeof file === "string") {
      fileContent.src = file;
    } else if (file instanceof File) {
      objectURL = URL.createObjectURL(file);
      fileContent.src = objectURL;
      objectURLs.push(objectURL);
    }
  } else if (fileType === "pdf") {
    fileContent = document.createElement("iframe");
    fileContent.className = "w-full h-[70vh] border-0";
    fileContent.title = fileName;

    if (typeof file === "string") {
      fileContent.src = file;
    } else if (file instanceof File) {
      objectURL = URL.createObjectURL(file);
      fileContent.src = objectURL;
      objectURLs.push(objectURL);
    }
  } else {
    // For unsupported file types or documents, show download option
    fileContent = document.createElement("div");
    fileContent.className = "text-center py-8";

    const fileIcon = document.createElement("span");
    fileIcon.className =
      "material-symbols-outlined text-6xl text-slate-400 mb-4";
    fileIcon.textContent = "description";

    const message = document.createElement("p");
    message.className = "text-slate-600 dark:text-slate-400 mb-4";
    message.textContent =
      "This file type cannot be previewed. Please download to view.";

    const downloadButton = document.createElement("button");
    downloadButton.className =
      "bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors";
    downloadButton.textContent = "Download File";
    downloadButton.onclick = () => downloadFile(file, fileName);

    fileContent.appendChild(fileIcon);
    fileContent.appendChild(message);
    fileContent.appendChild(downloadButton);
  }

  contentArea.appendChild(fileContent);

  // Create footer with actions
  const footer = document.createElement("div");
  footer.className =
    "flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700";

  const downloadBtn = document.createElement("button");
  downloadBtn.className =
    "flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600";
  downloadBtn.innerHTML =
    '<span class="material-symbols-outlined text-base">download</span> Download';
  downloadBtn.onclick = () => secureDownloadFile(file, fileName);

  const closeBtn = document.createElement("button");
  closeBtn.className =
    "bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => closeFileDialog();

  footer.appendChild(downloadBtn);
  footer.appendChild(closeBtn);

  // Assemble modal
  modalContent.appendChild(header);
  modalContent.appendChild(contentArea);
  modalContent.appendChild(footer);
  modalOverlay.appendChild(modalContent);

  // Add to document
  document.body.appendChild(modalOverlay);

  // Add escape key listener
  escapeHandler = (e) => {
    if (e.key === "Escape") {
      closeFileDialog();
    }
  };
  document.addEventListener("keydown", escapeHandler);

  // Prevent background scrolling
  document.body.style.overflow = "hidden";
}

/**
 * Close the file dialog and clean up
 */
export function closeFileDialog() {
  const modal = document.getElementById("file-viewer-modal");
  if (modal) {
    modal.remove();
  }

  // Remove event listener
  if (escapeHandler) {
    document.removeEventListener("keydown", escapeHandler);
    escapeHandler = null;
  }

  // Restore scrolling
  document.body.style.overflow = "";

  // Clean up object URLs
  cleanupObjectURLs();
}

/**
 * Clean up any object URLs created for file previews
 */
export function cleanupObjectURLs() {
  objectURLs.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  objectURLs = [];
}

/**
 * Helper method to detect file type from URL or filename
 * @param {string} urlOrFilename - File URL or filename
 * @returns {string} File type ('image', 'pdf', 'document')
 */
export function detectFileType(urlOrFilename) {
  if (!urlOrFilename) return "document";

  let fileString;

  // Handle different input types
  if (typeof urlOrFilename === "string") {
    fileString = urlOrFilename;
  } else if (urlOrFilename instanceof File) {
    // If it's a File object, use the name
    fileString = urlOrFilename.name;
  } else if (urlOrFilename.name) {
    // If it has a name property (like File objects)
    fileString = urlOrFilename.name;
  } else if (urlOrFilename.type) {
    // If it has a type property (MIME type)
    fileString = urlOrFilename.type;
  } else {
    // Fallback: try to convert to string
    fileString = String(urlOrFilename);
  }

  const lower = fileString.toLowerCase();

  // Image extensions
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
    ".svg",
  ];
  if (imageExtensions.some((ext) => lower.includes(ext))) {
    return "image";
  }

  // PDF extension
  if (lower.includes(".pdf")) {
    return "pdf";
  }

  // Document extensions
  const documentExtensions = [".doc", ".docx", ".txt", ".rtf"];
  if (documentExtensions.some((ext) => lower.includes(ext))) {
    return "document";
  }

  // Also check for MIME types
  if (typeof urlOrFilename === "object" && urlOrFilename.type) {
    const mimeType = urlOrFilename.type.toLowerCase();
    if (mimeType.startsWith("image/")) {
      return "image";
    }
    if (mimeType === "application/pdf") {
      return "pdf";
    }
    if (
      mimeType.includes("document") ||
      mimeType.includes("msword") ||
      mimeType.includes("text/")
    ) {
      return "document";
    }
  }

  return "document";
}
/**
 * Extract filename from Firebase Storage URL
 * @param {string} url - Firebase Storage URL
 * @returns {string} Extracted filename
 */
export function extractFileNameFromUrl(url) {
  if (!url) return null;

  try {
    // Extract the filename from Firebase Storage URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/.../uploads%2FuserId%2Ffolder%2Ftimestamp_filename.ext?alt=media...
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);

    // Split by '/' and get the last part
    const pathParts = pathname.split("/");
    const fileNameWithTimestamp = pathParts[pathParts.length - 1];

    // Remove timestamp prefix (format: timestamp_filename.ext)
    // The timestamp is usually at the beginning followed by underscore
    const fileNameParts = fileNameWithTimestamp.split("_");

    if (fileNameParts.length > 1) {
      // Remove the first part (timestamp) and join the rest
      return fileNameParts.slice(1).join("_");
    } else {
      return fileNameWithTimestamp;
    }
  } catch (error) {
    console.error("Error extracting filename from URL:", error);
    return null;
  }
}

/**
 * Enhanced method to show existing file with auto-detection
 * @param {string} fileUrl - File URL from storage
 * @param {string} fileType - Type of file for display
 */
export function viewExistingFile(fileUrl, fileType = "Document") {
  if (!fileUrl) {
    console.error("No file URL provided");
    return;
  }

  const detectedType = detectFileType(fileUrl);
  const fileName = extractFileNameFromUrl(fileUrl) || fileType;

  showFileDialog(fileUrl, detectedType, fileName);
}

/**
 * Show file dialog for uploaded files (File objects)
 * @param {File} file - File object from input
 */
export function showUploadedFileDialog(file) {
  if (!file) {
    console.error("No file provided");
    return;
  }

  const detectedType = detectFileType(file.name);
  showFileDialog(file, detectedType, file.name);
}

/**
 * Download file securely without exposing URL
 * @param {string|File} file - File URL or File object
 * @param {string} fileName - Name for the downloaded file
 */
export function downloadFile(file, fileName) {
  if (typeof file === "string") {
    // For URLs, fetch the file and create a blob download
    fetch(file)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.blob();
      })
      .then((blob) => {
        // Create object URL from blob
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
      })
      .catch((error) => {
        console.error("Error downloading file:", error);
        // Fallback to original method if fetch fails
        fallbackDownload(file, fileName);
      });
  } else if (file instanceof File) {
    // For File objects, create object URL
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

/**
 * Fallback download method (only used if fetch fails)
 * @param {string} fileUrl - File URL
 * @param {string} fileName - File name
 */
function fallbackDownload(fileUrl, fileName) {
  console.warn("Using fallback download method");
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  link.style.display = "none";
  link.target = "_blank"; // Only as fallback

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Enhanced secure download with better error handling
 * @param {string|File} file - File URL or File object
 * @param {string} fileName - Name for the downloaded file
 */
export async function secureDownloadFile(file, fileName) {
  try {
    if (typeof file === "string") {
      // Add cache busting to avoid cached responses
      const urlWithCacheBust = `${file}${
        file.includes("?") ? "&" : "?"
      }_=${Date.now()}`;

      const response = await fetch(urlWithCacheBust, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Check if blob is valid
      if (blob.size === 0) {
        throw new Error("Empty file received");
      }

      // Create secure download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up immediately
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } else if (file instanceof File) {
      // Handle File objects
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  } catch (error) {
    console.error("Secure download failed:", error);

    // Final fallback with user notification
    if (typeof file === "string") {
      showDownloadFallbackNotification(file, fileName);
    } else {
      // For File objects, we should always be able to download
      console.error("File object download failed:", error);
    }
  }
}

/**
 * Show notification for fallback download with user confirmation
 * @param {string} fileUrl - File URL
 * @param {string} fileName - File name
 */
function showDownloadFallbackNotification(fileUrl, fileName) {
  // Create a notification modal
  const notification = document.createElement("div");
  notification.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
  notification.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Download Required</h3>
            <p class="text-slate-600 dark:text-slate-400 mb-4">
                The file "${fileName}" needs to be downloaded. This will open in a new tab.
            </p>
            <div class="flex justify-end gap-3">
                <button class="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" id="cancel-download">
                    Cancel
                </button>
                <button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors" id="confirm-download">
                    Download
                </button>
            </div>
        </div>
    `;

  document.body.appendChild(notification);

  // Add event listeners
  document.getElementById("cancel-download").onclick = () => {
    notification.remove();
  };

  document.getElementById("confirm-download").onclick = () => {
    fallbackDownload(fileUrl, fileName);
    notification.remove();
  };

  // Close on background click
  notification.onclick = (e) => {
    if (e.target === notification) {
      notification.remove();
    }
  };
}

// Update the download button in showFileDialog to use secureDownloadFile
// In the showFileDialog function, replace:
// downloadBtn.onclick = () => downloadFile(file, fileName);
// with:
// downloadBtn.onclick = () => secureDownloadFile(file, fileName);

// Export all functions as default object for convenience
export default {
  showFileDialog,
  closeFileDialog,
  downloadFile,
  cleanupObjectURLs,
  detectFileType,
  extractFileNameFromUrl,
  viewExistingFile,
  showUploadedFileDialog,
};


function messageDialog(hideCancel = true, application , fromEdit=true) {
  var currentApplication = application;
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; 
      align-items: center; z-index: 1000; font-family: sans-serif;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
      background: white; padding: 24px; border-radius: 8px; 
      width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
  `;

  // Get student email for email mode
  const studentEmail = currentApplication.student?.email || '';
  const studentName = currentApplication.student?.fullName || 'Student';

  // Conditionally render the buttons based on hideCancel parameter
  const buttonsHTML = hideCancel
      ? `<div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="send-notification" style="padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: white; color: #007bff; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="notification-text">Send Notification</span>
              <span id="notification-loading" style="display: none;">Sending...</span>
          </button>
          <button id="send-email" style="padding: 8px 16px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="email-text">Send Email</span>
              <span id="email-loading" style="display: none;">Sending...</span>
          </button>
      </div>`
      : `<div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-message" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">
              Cancel
          </button>
          <button id="send-notification" style="padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: white; color: #007bff; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="notification-text">Send Notification</span>
              <span id="notification-loading" style="display: none;">Sending...</span>
          </button>
          <button id="send-email" style="padding: 8px 16px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="email-text">Send Email</span>
              <span id="email-loading" style="display: none;">Sending...</span>
          </button>
      </div>`;

      var edit = fromEdit?'<p style="margin: 0 0 20px 0; color: #333;"> Kindly leave a note for the student </p>':'<h2 style="margin: 0 0 20px 0; color: #333;">Contact Student</h2>';
      console.log("from edit is "+fromEdit);

  modal.innerHTML = `
        ${edit}  
      <!-- Communication Mode Selection -->
      <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #495057;">Communication Method</h3>
          <div style="display: flex; gap: 16px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="radio" name="communication-mode" value="notification" checked>
                  <span>In-App Notification</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="radio" name="communication-mode" value="email">
                  <span>Email</span>
              </label>
          </div>
      </div>

      <!-- Student Information -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Student Name</label>
          <input type="text" id="student-name" placeholder="Enter student name" 
              value="${studentName}"
              style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
      </div>

      <!-- Email Field (shown when email mode is selected) -->
      <div id="email-field" style="margin-bottom: 16px; display: none;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Email Address</label>
          <input type="email" id="student-email" placeholder="Enter student email" 
              value="${studentEmail}"
              style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
          <small style="color: #6c757d; font-size: 12px;">This will open your default email client</small>
      </div>

      <!-- Message Field -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Message</label>
          <textarea id="message-text" rows="6" placeholder="Type your message to the student..."
                  style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;">
Hello ${studentName},

I'd like to schedule a time to discuss your industrial training progress.

Are you available sometime this week?

Best regards
          </textarea>
      </div>

      <!-- Message Templates -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Quick Templates</label>
          <select id="message-templates" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white;">
              <option value="">Select a template...</option>
              <option value="progress_check">Progress Check</option>
              <option value="meeting_request">Meeting Request</option>
              <option value="document_request">Document Submission Reminder</option>
              <option value="feedback_request">Feedback Request</option>
          </select>
      </div>

      ${buttonsHTML}
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Get references to elements
  const sendNotificationBtn = modal.querySelector("#send-notification");
  const sendEmailBtn = modal.querySelector("#send-email");
  const notificationText = modal.querySelector("#notification-text");
  const notificationLoading = modal.querySelector("#notification-loading");
  const emailText = modal.querySelector("#email-text");
  const emailLoading = modal.querySelector("#email-loading");
  const studentNameInput = modal.querySelector("#student-name");
  const studentEmailInput = modal.querySelector("#student-email");
  const messageTextarea = modal.querySelector("#message-text");
  const emailField = modal.querySelector("#email-field");
  const communicationModeRadios = modal.querySelectorAll('input[name="communication-mode"]');
  const templateSelect = modal.querySelector("#message-templates");

  // Message templates
  const messageTemplates = {
      progress_check: `Hello {name},

I hope you're doing well with your industrial training. I'd like to check on your progress and see how everything is going.

Could you please provide a brief update on your current tasks and any challenges you're facing?

Looking forward to hearing from you.

Best regards`,

      meeting_request: `Hello {name},

I'd like to schedule a meeting to discuss your industrial training progress and address any questions or concerns you may have.

Please let me know your availability for this week.

Best regards`,

      document_request: `Hello {name},

This is a friendly reminder to submit your required training documents if you haven't already done so.

Please ensure all documents are submitted by the deadline.

Thank you for your cooperation.

Best regards`,

      feedback_request: `Hello {name},

I'd like to get your feedback on the industrial training program so far. Your input is valuable for improving the experience.

Please share any suggestions or concerns you may have.

Best regards`
  };

  // Event handlers
  const closeModal = () => document.body.removeChild(modalOverlay);

  // Function to set loading state for notification
  const setNotificationLoadingState = (isLoading) => {
      if (isLoading) {
          sendNotificationBtn.disabled = true;
          sendNotificationBtn.style.opacity = "0.6";
          sendNotificationBtn.style.cursor = "not-allowed";
          notificationText.style.display = "none";
          notificationLoading.style.display = "inline";
      } else {
          sendNotificationBtn.disabled = false;
          sendNotificationBtn.style.opacity = "1";
          sendNotificationBtn.style.cursor = "pointer";
          notificationText.style.display = "inline";
          notificationLoading.style.display = "none";
      }
  };

  // Function to set loading state for email
  const setEmailLoadingState = (isLoading) => {
      if (isLoading) {
          sendEmailBtn.disabled = true;
          sendEmailBtn.style.opacity = "0.6";
          sendEmailBtn.style.cursor = "not-allowed";
          emailText.style.display = "none";
          emailLoading.style.display = "inline";
      } else {
          sendEmailBtn.disabled = false;
          sendEmailBtn.style.opacity = "1";
          sendEmailBtn.style.cursor = "pointer";
          emailText.style.display = "inline";
          emailLoading.style.display = "none";
      }
  };

  // Function to disable all inputs
  const disableInputs = (disabled) => {
      studentNameInput.disabled = disabled;
      messageTextarea.disabled = disabled;
      if (studentEmailInput) studentEmailInput.disabled = disabled;
      templateSelect.disabled = disabled;
      communicationModeRadios.forEach(radio => radio.disabled = disabled);
  };

  // Communication mode change handler
  communicationModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
          if (e.target.value === 'email') {
              emailField.style.display = 'block';
              sendNotificationBtn.style.display = 'none';
              sendEmailBtn.style.display = 'flex';
          } else {
              emailField.style.display = 'none';
              sendNotificationBtn.style.display = 'flex';
              sendEmailBtn.style.display = 'none';
          }
      });
  });

  // Template selection handler
  templateSelect.addEventListener('change', (e) => {
      const template = e.target.value;
      if (template && messageTemplates[template]) {
          messageTextarea.value = messageTemplates[template].replace(/{name}/g, studentNameInput.value);
      }
  });

  // Only add cancel event listener if cancel button exists
  if (!hideCancel) {
      modal.querySelector("#cancel-message").addEventListener("click", closeModal);
  }

  // Send Notification Handler
  sendNotificationBtn.addEventListener("click", async () => {
      const studentName = studentNameInput.value;
      const messageText = messageTextarea.value;

      if (!studentName || !messageText) {
          alert("Please enter student name and message");
          return;
      }

      // Set loading state
      setNotificationLoadingState(true);
      disableInputs(true);

      try {
          const studentUid = currentApplication.student?.uid;
          const companyName = currentApplication.companyName || 'Our Company';

          if (!studentUid) {
              alert("Student information is missing");
              setNotificationLoadingState(false);
              disableInputs(false);
              return;
          }

          const result = await it_base_companycloud.sendNotificationToStudent(
              studentUid,
              {
                  title: "New Message from " + companyName,
                  message: messageText,
                  type: "message",
                  timestamp: new Date().toISOString()
              }
          );

          if (result.success) {
              setTimeout(() => {
                  alert(`Notification sent to ${studentName}`);
                  closeModal();
              }, 500);
          } else {
              alert("Failed to send notification: " + (result.error || 'Unknown error'));
              setNotificationLoadingState(false);
              disableInputs(false);
          }
      } catch (error) {
          alert("Error sending notification: " + error.message);
          setNotificationLoadingState(false);
          disableInputs(false);
      }
  });

  // Send Email Handler
  sendEmailBtn.addEventListener("click", async () => {
      const studentName = studentNameInput.value;
      const studentEmail = studentEmailInput.value;
      const messageText = messageTextarea.value;

      if (!studentName || !studentEmail || !messageText) {
          alert("Please enter student name, email, and message");
          return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentEmail)) {
          alert("Please enter a valid email address");
          return;
      }

      // Set loading state
      setEmailLoadingState(true);
      disableInputs(true);

      try {
          // Create email subject and body
          const companyName = currentApplication.companyName || 'Our Company';
          const subject = `Message from ${companyName} - Industrial Training`;
          const body = messageText;

          // Encode the email parameters
          const encodedSubject = encodeURIComponent(subject);
          const encodedBody = encodeURIComponent(body);

          // Create mailto link
          const mailtoLink = `mailto:${studentEmail}?subject=${encodedSubject}&body=${encodedBody}`;

          // Open email client
          window.open(mailtoLink, '_blank');

          // Simulate sending completion (since we can't track email actually being sent)
          setTimeout(() => {
              setEmailLoadingState(false);
              disableInputs(false);
              alert(`Email opened for ${studentName}. Please send it from your email client.`);
              closeModal();
          }, 1000);

      } catch (error) {
          alert("Error preparing email: " + error.message);
          setEmailLoadingState(false);
          disableInputs(false);
      }
  });

  // Only allow clicking outside to close if cancel button is visible
  if (!hideCancel) {
      modalOverlay.addEventListener("click", (e) => {
          if (e.target === modalOverlay) closeModal();
      });
  }

  // Initialize UI state
  communicationModeRadios[0].checked = true; // Default to notification mode
  sendEmailBtn.style.display = 'none'; // Hide email button initially
}

export {messageDialog}