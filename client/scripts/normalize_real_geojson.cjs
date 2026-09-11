const fs = require('fs');
const path = require('path');

const rawFile = path.join(__dirname, '../public/geo/india_districts.json');
const rawGeo = JSON.parse(fs.readFileSync(rawFile, 'utf8'));

// Telangana districts list for proper state segregation
const TELANGANA_DISTRICTS = new Set([
  'adilabad', 'bhadradri kothagudem', 'hanumakonda', 'hyderabad', 'jagitial', 'jangoan',
  'jayashankar bhupalapally', 'jogulamba gadwal', 'kamareddy', 'karimnagar', 'khammam',
  'kumuram bheem asifabad', 'mahabubabad', 'mahabubnagar', 'mancherial', 'medak', 'medchal malkajgiri',
  'mulugu', 'nagarkurnool', 'nalgonda', 'narayanpet', 'nirmal', 'nizamabad', 'peddapalli',
  'rajanna sircilla', 'ranga reddy', 'rangareddi', 'sangareddy', 'siddipet', 'suryapet',
  'vikarabad', 'wanaparthy', 'warangal', 'yadadri bhuvanagiri', 'warangal urban', 'warangal rural'
]);

// Standardize state names
const STATE_RENAME = {
  'orissa': 'Odisha',
  'uttaranchal': 'Uttarakhand',
  'andaman and nicobar': 'Andaman And Nicobar Islands',
  'jammu and kashmir': 'Jammu And Kashmir',
  'dadra and nagar haveli': 'The Dadra And Nagar Haveli And Daman And Diu',
  'daman and diu': 'The Dadra And Nagar Haveli And Daman And Diu'
};

// District name aliases
const DISTRICT_ALIASES = {
  'greater bombay': 'Mumbai',
  'bombay': 'Mumbai',
  'mumbai': 'Mumbai',
  'bid': 'Beed',
  'buldana': 'Buldhana',
  'garhchiroli': 'Gadchiroli',
  'gondiya': 'Gondia',
  'ahmednagar': 'Ahmednagar',
  'osmanabad': 'Osmanabad',
  'aurangabad': 'Aurangabad',
  'raigarh': 'Raigad', // When in Maharashtra
  'khurda': 'Khordha',
  'cuttack': 'Cuttack',
  'balasore': 'Baleshwar',
  'keonjhar': 'Kendujhar',
  'bargarh': 'Baragada',
  'sundergarh': 'Sundaragada',
  'angul': 'Anugola',
  'kendrapara': 'Kendrapada',
  'jagatsinghpur': 'Jagatsinghapur',
  'nayagarh': 'Nayagada',
  'bolangir': 'Balangir',
  'sonepur': 'Subarnapur',
  'kandhamal': 'Kandhamala',
  'deogarh': 'Debagada'
};

// Calculate true center of polygon coordinates
function getCentroid(coords) {
  let pts = [];
  function extractPts(c) {
    if (typeof c[0] === 'number') {
      pts.push(c);
    } else {
      c.forEach(extractPts);
    }
  }
  extractPts(coords);
  if (pts.length === 0) return [78.9629, 20.5937];
  let sumLon = 0, sumLat = 0;
  pts.forEach(([lon, lat]) => {
    sumLon += lon;
    sumLat += lat;
  });
  return [Number((sumLon / pts.length).toFixed(4)), Number((sumLat / pts.length).toFixed(4))];
}

const enrichedFeatures = [];
let featId = 1;

for (const feat of rawGeo.features) {
  let rawState = (feat.properties.NAME_1 || feat.properties.state || feat.properties.ST_NM || '').trim();
  let rawDistrict = (feat.properties.NAME_2 || feat.properties.district || feat.properties.DISTRICT || '').trim();

  const stateKey = rawState.toLowerCase();
  const districtKey = rawDistrict.toLowerCase();

  // 1. Resolve State
  let finalState = STATE_RENAME[stateKey] || rawState;
  
  // Separate Telangana from Andhra Pradesh
  if (stateKey === 'andhra pradesh' && TELANGANA_DISTRICTS.has(districtKey)) {
    finalState = 'Telangana';
  }

  // 2. Resolve District Name
  let finalDistrict = DISTRICT_ALIASES[districtKey] || rawDistrict;

  // In Maharashtra, Raigarh is Raigad
  if (finalState === 'Maharashtra' && districtKey === 'raigarh') {
    finalDistrict = 'Raigad';
  }

  const [centroidLon, centroidLat] = getCentroid(feat.geometry.coordinates);

  enrichedFeatures.push({
    type: 'Feature',
    id: featId++,
    properties: {
      ...feat.properties,
      district: finalDistrict,
      dtname: finalDistrict,
      district_name: finalDistrict,
      raw_name: rawDistrict,
      state: finalState,
      st_nm: finalState,
      latitude: centroidLat,
      longitude: centroidLon,
    },
    geometry: feat.geometry,
  });

  // If Greater Bombay/Mumbai, also add alias feature for Mumbai Suburban
  if (finalState === 'Maharashtra' && (districtKey === 'greater bombay' || districtKey === 'mumbai')) {
    enrichedFeatures.push({
      type: 'Feature',
      id: featId++,
      properties: {
        ...feat.properties,
        district: 'Mumbai Suburban',
        dtname: 'Mumbai Suburban',
        district_name: 'Mumbai Suburban',
        state: 'Maharashtra',
        st_nm: 'Maharashtra',
        latitude: centroidLat,
        longitude: centroidLon,
      },
      geometry: feat.geometry,
    });
  }
}

const finalGeoJson = {
  type: 'FeatureCollection',
  features: enrichedFeatures,
};

fs.writeFileSync(rawFile, JSON.stringify(finalGeoJson), 'utf8');
console.log(`✅ Normalized real GeoJSON written:`);
console.log(`   - Total real polygon features: ${enrichedFeatures.length}`);
console.log(`   - Saved to: ${rawFile}`);
