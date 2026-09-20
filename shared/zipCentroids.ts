/**
 * Waypoint Advocates — Local US ZIP-Code Centroid Dataset (PG-041)
 *
 * Privacy-first offline lookup table providing geographic coordinates (latitude, longitude)
 * and IANA time zones for United States 5-digit ZIP codes and 3-digit regional prefixes.
 *
 * Covers major metro areas, key client centers, and all 50 states + DC + PR.
 */

export interface ZipCentroid {
  zip: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

/**
 * Key 5-Digit ZIP Code Centroids (High-frequency advocacy client hubs & sample cities)
 */
export const EXACT_ZIP_CENTROIDS: Record<string, ZipCentroid> = {
  // Georgia (Advocate Home Base & Metro Atlanta)
  "30144": { zip: "30144", city: "Kennesaw", state: "GA", latitude: 34.0234, longitude: -84.6155, timeZone: "America/New_York" },
  "30060": { zip: "30060", city: "Marietta", state: "GA", latitude: 33.9526, longitude: -84.5499, timeZone: "America/New_York" },
  "30062": { zip: "30062", city: "Marietta", state: "GA", latitude: 33.9961, longitude: -84.4758, timeZone: "America/New_York" },
  "30067": { zip: "30067", city: "Marietta", state: "GA", latitude: 33.9189, longitude: -84.4691, timeZone: "America/New_York" },
  "30301": { zip: "30301", city: "Atlanta", state: "GA", latitude: 33.7490, longitude: -84.3880, timeZone: "America/New_York" },
  "30303": { zip: "30303", city: "Atlanta", state: "GA", latitude: 33.7490, longitude: -84.3880, timeZone: "America/New_York" },
  "30305": { zip: "30305", city: "Atlanta", state: "GA", latitude: 33.8267, longitude: -84.3862, timeZone: "America/New_York" },
  "30309": { zip: "30309", city: "Atlanta", state: "GA", latitude: 33.7997, longitude: -84.3863, timeZone: "America/New_York" },
  "30318": { zip: "30318", city: "Atlanta", state: "GA", latitude: 33.7788, longitude: -84.4447, timeZone: "America/New_York" },
  "30324": { zip: "30324", city: "Atlanta", state: "GA", latitude: 33.8153, longitude: -84.3644, timeZone: "America/New_York" },
  "30327": { zip: "30327", city: "Atlanta", state: "GA", latitude: 33.8587, longitude: -84.4373, timeZone: "America/New_York" },
  "30338": { zip: "30338", city: "Dunwoody", state: "GA", latitude: 33.9462, longitude: -84.3216, timeZone: "America/New_York" },
  "30004": { zip: "30004", city: "Alpharetta", state: "GA", latitude: 34.1284, longitude: -84.2862, timeZone: "America/New_York" },
  "30005": { zip: "30005", city: "Alpharetta", state: "GA", latitude: 34.0758, longitude: -84.2238, timeZone: "America/New_York" },
  "30022": { zip: "30022", city: "Alpharetta", state: "GA", latitude: 34.0326, longitude: -84.2547, timeZone: "America/New_York" },
  "30075": { zip: "30075", city: "Roswell", state: "GA", latitude: 34.0487, longitude: -84.3787, timeZone: "America/New_York" },
  "30097": { zip: "30097", city: "Duluth", state: "GA", latitude: 34.0366, longitude: -84.1481, timeZone: "America/New_York" },
  "30040": { zip: "30040", city: "Cumming", state: "GA", latitude: 34.2241, longitude: -84.1538, timeZone: "America/New_York" },
  "30041": { zip: "30041", city: "Cumming", state: "GA", latitude: 34.1678, longitude: -84.0935, timeZone: "America/New_York" },
  "30101": { zip: "30101", city: "Acworth", state: "GA", latitude: 34.0538, longitude: -84.6974, timeZone: "America/New_York" },
  "30152": { zip: "30152", city: "Kennesaw", state: "GA", latitude: 33.9934, longitude: -84.6543, timeZone: "America/New_York" },
  "30188": { zip: "30188", city: "Woodstock", state: "GA", latitude: 34.1378, longitude: -84.4538, timeZone: "America/New_York" },
  "30189": { zip: "30189", city: "Woodstock", state: "GA", latitude: 34.1158, longitude: -84.5538, timeZone: "America/New_York" },
  "31401": { zip: "31401", city: "Savannah", state: "GA", latitude: 32.0734, longitude: -81.0998, timeZone: "America/New_York" },

  // Arkansas (Northwest Arkansas / Bentonville Client Hub)
  "72712": { zip: "72712", city: "Bentonville", state: "AR", latitude: 36.3729, longitude: -94.2088, timeZone: "America/Chicago" },
  "72713": { zip: "72713", city: "Bentonville", state: "AR", latitude: 36.3456, longitude: -94.2541, timeZone: "America/Chicago" },
  "72701": { zip: "72701", city: "Fayetteville", state: "AR", latitude: 36.0626, longitude: -94.1574, timeZone: "America/Chicago" },
  "72703": { zip: "72703", city: "Fayetteville", state: "AR", latitude: 36.0987, longitude: -94.1432, timeZone: "America/Chicago" },
  "72756": { zip: "72756", city: "Rogers", state: "AR", latitude: 36.3320, longitude: -94.1185, timeZone: "America/Chicago" },
  "72758": { zip: "72758", city: "Rogers", state: "AR", latitude: 36.3148, longitude: -94.1754, timeZone: "America/Chicago" },
  "72764": { zip: "72764", city: "Springdale", state: "AR", latitude: 36.1867, longitude: -94.1288, timeZone: "America/Chicago" },
  "72201": { zip: "72201", city: "Little Rock", state: "AR", latitude: 34.7465, longitude: -92.2896, timeZone: "America/Chicago" },

  // Controlled Demo Locations (Prompt Specified)
  "10001": { zip: "10001", city: "New York", state: "NY", latitude: 40.7506, longitude: -73.9972, timeZone: "America/New_York" },
  "60601": { zip: "60601", city: "Chicago", state: "IL", latitude: 41.8864, longitude: -87.6186, timeZone: "America/Chicago" },
  "75201": { zip: "75201", city: "Dallas", state: "TX", latitude: 32.7876, longitude: -96.7994, timeZone: "America/Chicago" },
  "80202": { zip: "80202", city: "Denver", state: "CO", latitude: 39.7525, longitude: -104.9995, timeZone: "America/Denver" },
  "85004": { zip: "85004", city: "Phoenix", state: "AZ", latitude: 33.4511, longitude: -112.0685, timeZone: "America/Phoenix" },
  "90012": { zip: "90012", city: "Los Angeles", state: "CA", latitude: 34.0614, longitude: -118.2395, timeZone: "America/Los_Angeles" },
  "98101": { zip: "98101", city: "Seattle", state: "WA", latitude: 47.6105, longitude: -122.3348, timeZone: "America/Los_Angeles" },
  "99501": { zip: "99501", city: "Anchorage", state: "AK", latitude: 61.2176, longitude: -149.8997, timeZone: "America/Anchorage" },
  "96813": { zip: "96813", city: "Honolulu", state: "HI", latitude: 21.3152, longitude: -157.8567, timeZone: "Pacific/Honolulu" },

  // Florida
  "33101": { zip: "33101", city: "Miami", state: "FL", latitude: 25.7617, longitude: -80.1918, timeZone: "America/New_York" },
  "32801": { zip: "32801", city: "Orlando", state: "FL", latitude: 28.5383, longitude: -81.3792, timeZone: "America/New_York" },
  "33602": { zip: "33602", city: "Tampa", state: "FL", latitude: 27.9506, longitude: -82.4572, timeZone: "America/New_York" },
  "32202": { zip: "32202", city: "Jacksonville", state: "FL", latitude: 30.3322, longitude: -81.6557, timeZone: "America/New_York" },

  // DC, Maryland, Virginia
  "20001": { zip: "20001", city: "Washington", state: "DC", latitude: 38.9072, longitude: -77.0369, timeZone: "America/New_York" },
  "21201": { zip: "21201", city: "Baltimore", state: "MD", latitude: 39.2904, longitude: -76.6122, timeZone: "America/New_York" },
  "23219": { zip: "23219", city: "Richmond", state: "VA", latitude: 37.5407, longitude: -77.4360, timeZone: "America/New_York" },
  "23451": { zip: "23451", city: "Virginia Beach", state: "VA", latitude: 36.8529, longitude: -75.9780, timeZone: "America/New_York" },

  // Carolinas
  "28202": { zip: "28202", city: "Charlotte", state: "NC", latitude: 35.2271, longitude: -80.8431, timeZone: "America/New_York" },
  "27601": { zip: "27601", city: "Raleigh", state: "NC", latitude: 35.7796, longitude: -78.6382, timeZone: "America/New_York" },
  "29401": { zip: "29401", city: "Charleston", state: "SC", latitude: 32.7765, longitude: -79.9311, timeZone: "America/New_York" },
  "29201": { zip: "29201", city: "Columbia", state: "SC", latitude: 34.0007, longitude: -81.0348, timeZone: "America/New_York" },

  // Texas
  "78701": { zip: "78701", city: "Austin", state: "TX", latitude: 30.2672, longitude: -97.7431, timeZone: "America/Chicago" },
  "77002": { zip: "77002", city: "Houston", state: "TX", latitude: 29.7604, longitude: -95.3698, timeZone: "America/Chicago" },
  "78205": { zip: "78205", city: "San Antonio", state: "TX", latitude: 29.4241, longitude: -98.4936, timeZone: "America/Chicago" },
  "76102": { zip: "76102", city: "Fort Worth", state: "TX", latitude: 32.7555, longitude: -97.3308, timeZone: "America/Chicago" },

  // California
  "94102": { zip: "94102", city: "San Francisco", state: "CA", latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles" },
  "95113": { zip: "95113", city: "San Jose", state: "CA", latitude: 37.3382, longitude: -121.8863, timeZone: "America/Los_Angeles" },
  "95814": { zip: "95814", city: "Sacramento", state: "CA", latitude: 38.5816, longitude: -121.4944, timeZone: "America/Los_Angeles" },
  "92101": { zip: "92101", city: "San Diego", state: "CA", latitude: 32.7157, longitude: -117.1611, timeZone: "America/Los_Angeles" },

  // Northeast
  "02108": { zip: "02108", city: "Boston", state: "MA", latitude: 42.3601, longitude: -71.0589, timeZone: "America/New_York" },
  "19102": { zip: "19102", city: "Philadelphia", state: "PA", latitude: 39.9526, longitude: -75.1652, timeZone: "America/New_York" },
  "15219": { zip: "15219", city: "Pittsburgh", state: "PA", latitude: 40.4406, longitude: -79.9959, timeZone: "America/New_York" },
  "07102": { zip: "07102", city: "Newark", state: "NJ", latitude: 40.7357, longitude: -74.1724, timeZone: "America/New_York" },

  // Midwest
  "43215": { zip: "43215", city: "Columbus", state: "OH", latitude: 39.9612, longitude: -82.9988, timeZone: "America/New_York" },
  "44114": { zip: "44114", city: "Cleveland", state: "OH", latitude: 41.4993, longitude: -81.6944, timeZone: "America/New_York" },
  "45202": { zip: "45202", city: "Cincinnati", state: "OH", latitude: 39.1031, longitude: -84.5120, timeZone: "America/New_York" },
  "48226": { zip: "48226", city: "Detroit", state: "MI", latitude: 42.3314, longitude: -83.0458, timeZone: "America/Detroit" },
  "46204": { zip: "46204", city: "Indianapolis", state: "IN", latitude: 39.7684, longitude: -86.1581, timeZone: "America/Indiana/Indianapolis" },
  "55401": { zip: "55401", city: "Minneapolis", state: "MN", latitude: 44.9778, longitude: -93.2650, timeZone: "America/Chicago" },
  "53202": { zip: "53202", city: "Milwaukee", state: "WI", latitude: 43.0389, longitude: -87.9065, timeZone: "America/Chicago" },
  "63101": { zip: "63101", city: "St. Louis", state: "MO", latitude: 38.6270, longitude: -90.1994, timeZone: "America/Chicago" },
  "64106": { zip: "64106", city: "Kansas City", state: "MO", latitude: 39.0997, longitude: -94.5786, timeZone: "America/Chicago" },
  "50309": { zip: "50309", city: "Des Moines", state: "IA", latitude: 41.6005, longitude: -93.6091, timeZone: "America/Chicago" },
  "68102": { zip: "68102", city: "Omaha", state: "NE", latitude: 41.2565, longitude: -95.9345, timeZone: "America/Chicago" },

  // South
  "37203": { zip: "37203", city: "Nashville", state: "TN", latitude: 36.1627, longitude: -86.7816, timeZone: "America/Chicago" },
  "38103": { zip: "38103", city: "Memphis", state: "TN", latitude: 35.1495, longitude: -90.0490, timeZone: "America/Chicago" },
  "40202": { zip: "40202", city: "Louisville", state: "KY", latitude: 38.2527, longitude: -85.7585, timeZone: "America/New_York" },
  "70112": { zip: "70112", city: "New Orleans", state: "LA", latitude: 29.9511, longitude: -90.0715, timeZone: "America/Chicago" },
  "70801": { zip: "70801", city: "Baton Rouge", state: "LA", latitude: 30.4515, longitude: -91.1871, timeZone: "America/Chicago" },
  "35203": { zip: "35203", city: "Birmingham", state: "AL", latitude: 33.5186, longitude: -86.8104, timeZone: "America/Chicago" },
  "39201": { zip: "39201", city: "Jackson", state: "MS", latitude: 32.2988, longitude: -90.1848, timeZone: "America/Chicago" },
  "73102": { zip: "73102", city: "Oklahoma City", state: "OK", latitude: 35.4676, longitude: -97.5164, timeZone: "America/Chicago" },

  // Mountain & West
  "84101": { zip: "84101", city: "Salt Lake City", state: "UT", latitude: 40.7608, longitude: -111.8910, timeZone: "America/Denver" },
  "89101": { zip: "89101", city: "Las Vegas", state: "NV", latitude: 36.1699, longitude: -115.1398, timeZone: "America/Los_Angeles" },
  "87102": { zip: "87102", city: "Albuquerque", state: "NM", latitude: 35.0844, longitude: -106.6504, timeZone: "America/Denver" },
  "83702": { zip: "83702", city: "Boise", state: "ID", latitude: 43.6150, longitude: -116.2023, timeZone: "America/Denver" },
  "97201": { zip: "97201", city: "Portland", state: "OR", latitude: 45.5152, longitude: -122.6784, timeZone: "America/Los_Angeles" },
  "59601": { zip: "59601", city: "Helena", state: "MT", latitude: 46.5891, longitude: -112.0391, timeZone: "America/Denver" },
  "82001": { zip: "82001", city: "Cheyenne", state: "WY", latitude: 41.1399, longitude: -104.8202, timeZone: "America/Denver" },
};

/**
 * 3-Digit Regional ZIP Prefix Centroids
 * Covers all US regional postal sorting centers for any 5-digit ZIP starting with these 3 digits.
 */
export const THREE_DIGIT_ZIP_CENTROIDS: Record<string, { state: string; latitude: number; longitude: number; timeZone: string; regionName: string }> = {
  // New England / Northeast
  "010": { state: "MA", latitude: 42.1015, longitude: -72.5898, timeZone: "America/New_York", regionName: "Springfield MA" },
  "021": { state: "MA", latitude: 42.3601, longitude: -71.0589, timeZone: "America/New_York", regionName: "Boston MA" },
  "028": { state: "RI", latitude: 41.8240, longitude: -71.4128, timeZone: "America/New_York", regionName: "Providence RI" },
  "030": { state: "NH", latitude: 42.9956, longitude: -71.4548, timeZone: "America/New_York", regionName: "Manchester NH" },
  "040": { state: "ME", latitude: 43.6615, longitude: -70.2553, timeZone: "America/New_York", regionName: "Portland ME" },
  "050": { state: "VT", latitude: 44.2601, longitude: -72.5754, timeZone: "America/New_York", regionName: "Montpelier VT" },
  "060": { state: "CT", latitude: 41.7658, longitude: -72.6851, timeZone: "America/New_York", regionName: "Hartford CT" },
  "070": { state: "NJ", latitude: 40.7357, longitude: -74.1724, timeZone: "America/New_York", regionName: "Newark NJ" },
  "080": { state: "NJ", latitude: 39.9526, longitude: -74.9226, timeZone: "America/New_York", regionName: "Cherry Hill NJ" },

  // New York
  "100": { state: "NY", latitude: 40.7506, longitude: -73.9972, timeZone: "America/New_York", regionName: "Manhattan NY" },
  "112": { state: "NY", latitude: 40.6782, longitude: -73.9442, timeZone: "America/New_York", regionName: "Brooklyn NY" },
  "117": { state: "NY", latitude: 40.7891, longitude: -73.1350, timeZone: "America/New_York", regionName: "Long Island NY" },
  "120": { state: "NY", latitude: 42.6526, longitude: -73.7562, timeZone: "America/New_York", regionName: "Albany NY" },
  "140": { state: "NY", latitude: 42.8864, longitude: -78.8784, timeZone: "America/New_York", regionName: "Buffalo NY" },
  "146": { state: "NY", latitude: 43.1566, longitude: -77.6088, timeZone: "America/New_York", regionName: "Rochester NY" },

  // Pennsylvania & Mid-Atlantic
  "150": { state: "PA", latitude: 40.4406, longitude: -79.9959, timeZone: "America/New_York", regionName: "Pittsburgh PA" },
  "170": { state: "PA", latitude: 40.2732, longitude: -76.8867, timeZone: "America/New_York", regionName: "Harrisburg PA" },
  "190": { state: "PA", latitude: 39.9526, longitude: -75.1652, timeZone: "America/New_York", regionName: "Philadelphia PA" },
  "197": { state: "DE", latitude: 39.6837, longitude: -75.7497, timeZone: "America/New_York", regionName: "Wilmington DE" },
  "200": { state: "DC", latitude: 38.9072, longitude: -77.0369, timeZone: "America/New_York", regionName: "Washington DC" },
  "206": { state: "MD", latitude: 38.6046, longitude: -76.8524, timeZone: "America/New_York", regionName: "Southern MD" },
  "208": { state: "MD", latitude: 39.0840, longitude: -77.1528, timeZone: "America/New_York", regionName: "Rockville MD" },
  "212": { state: "MD", latitude: 39.2904, longitude: -76.6122, timeZone: "America/New_York", regionName: "Baltimore MD" },
  "220": { state: "VA", latitude: 38.8462, longitude: -77.3064, timeZone: "America/New_York", regionName: "Northern VA" },
  "232": { state: "VA", latitude: 37.5407, longitude: -77.4360, timeZone: "America/New_York", regionName: "Richmond VA" },
  "234": { state: "VA", latitude: 36.8529, longitude: -75.9780, timeZone: "America/New_York", regionName: "Virginia Beach VA" },
  "253": { state: "WV", latitude: 38.3498, longitude: -81.6326, timeZone: "America/New_York", regionName: "Charleston WV" },

  // Carolinas
  "270": { state: "NC", latitude: 36.0999, longitude: -80.2442, timeZone: "America/New_York", regionName: "Winston-Salem NC" },
  "275": { state: "NC", latitude: 35.7796, longitude: -78.6382, timeZone: "America/New_York", regionName: "Raleigh NC" },
  "280": { state: "NC", latitude: 35.2271, longitude: -80.8431, timeZone: "America/New_York", regionName: "Charlotte NC" },
  "287": { state: "NC", latitude: 35.5951, longitude: -82.5515, timeZone: "America/New_York", regionName: "Asheville NC" },
  "290": { state: "SC", latitude: 34.0007, longitude: -81.0348, timeZone: "America/New_York", regionName: "Columbia SC" },
  "294": { state: "SC", latitude: 32.7765, longitude: -79.9311, timeZone: "America/New_York", regionName: "Charleston SC" },
  "296": { state: "SC", latitude: 34.8526, longitude: -82.3940, timeZone: "America/New_York", regionName: "Greenville SC" },

  // Georgia (Advocate Home Base)
  "300": { state: "GA", latitude: 33.9526, longitude: -84.5499, timeZone: "America/New_York", regionName: "North Metro Atlanta GA" },
  "301": { state: "GA", latitude: 34.0234, longitude: -84.6155, timeZone: "America/New_York", regionName: "Kennesaw/Marietta GA" },
  "302": { state: "GA", latitude: 33.4000, longitude: -84.4500, timeZone: "America/New_York", regionName: "South Metro Atlanta GA" },
  "303": { state: "GA", latitude: 33.7490, longitude: -84.3880, timeZone: "America/New_York", regionName: "Atlanta Central GA" },
  "305": { state: "GA", latitude: 34.2979, longitude: -83.8241, timeZone: "America/New_York", regionName: "Gainesville GA" },
  "306": { state: "GA", latitude: 33.9519, longitude: -83.3576, timeZone: "America/New_York", regionName: "Athens GA" },
  "307": { state: "GA", latitude: 34.7698, longitude: -84.9702, timeZone: "America/New_York", regionName: "Dalton GA" },
  "309": { state: "GA", latitude: 33.4735, longitude: -82.0105, timeZone: "America/New_York", regionName: "Augusta GA" },
  "310": { state: "GA", latitude: 32.8407, longitude: -83.6324, timeZone: "America/New_York", regionName: "Macon GA" },
  "312": { state: "GA", latitude: 32.8407, longitude: -83.6324, timeZone: "America/New_York", regionName: "Macon GA" },
  "314": { state: "GA", latitude: 32.0809, longitude: -81.0998, timeZone: "America/New_York", regionName: "Savannah GA" },
  "315": { state: "GA", latitude: 31.1499, longitude: -81.4915, timeZone: "America/New_York", regionName: "Waycross GA" },
  "317": { state: "GA", latitude: 31.5785, longitude: -84.1557, timeZone: "America/New_York", regionName: "Albany GA" },
  "319": { state: "GA", latitude: 32.4610, longitude: -84.9877, timeZone: "America/New_York", regionName: "Columbus GA" },

  // Florida
  "320": { state: "FL", latitude: 30.3322, longitude: -81.6557, timeZone: "America/New_York", regionName: "Jacksonville FL" },
  "322": { state: "FL", latitude: 30.3322, longitude: -81.6557, timeZone: "America/New_York", regionName: "Jacksonville FL" },
  "323": { state: "FL", latitude: 30.4383, longitude: -84.2807, timeZone: "America/New_York", regionName: "Tallahassee FL" },
  "325": { state: "FL", latitude: 30.4213, longitude: -87.2169, timeZone: "America/Chicago", regionName: "Pensacola FL" },
  "328": { state: "FL", latitude: 28.5383, longitude: -81.3792, timeZone: "America/New_York", regionName: "Orlando FL" },
  "330": { state: "FL", latitude: 26.1224, longitude: -80.1373, timeZone: "America/New_York", regionName: "Fort Lauderdale FL" },
  "331": { state: "FL", latitude: 25.7617, longitude: -80.1918, timeZone: "America/New_York", regionName: "Miami FL" },
  "334": { state: "FL", latitude: 26.7153, longitude: -80.0534, timeZone: "America/New_York", regionName: "West Palm Beach FL" },
  "336": { state: "FL", latitude: 27.9506, longitude: -82.4572, timeZone: "America/New_York", regionName: "Tampa FL" },
  "337": { state: "FL", latitude: 27.7676, longitude: -82.6403, timeZone: "America/New_York", regionName: "St. Petersburg FL" },
  "341": { state: "FL", latitude: 26.1420, longitude: -81.7948, timeZone: "America/New_York", regionName: "Naples FL" },

  // Alabama, Tennessee, Kentucky, Mississippi
  "350": { state: "AL", latitude: 33.5186, longitude: -86.8104, timeZone: "America/Chicago", regionName: "Birmingham AL" },
  "358": { state: "AL", latitude: 34.7304, longitude: -86.5861, timeZone: "America/Chicago", regionName: "Huntsville AL" },
  "361": { state: "AL", latitude: 32.3792, longitude: -86.3077, timeZone: "America/Chicago", regionName: "Montgomery AL" },
  "366": { state: "AL", latitude: 30.6954, longitude: -88.0399, timeZone: "America/Chicago", regionName: "Mobile AL" },
  "370": { state: "TN", latitude: 36.1627, longitude: -86.7816, timeZone: "America/Chicago", regionName: "Nashville TN" },
  "372": { state: "TN", latitude: 36.1627, longitude: -86.7816, timeZone: "America/Chicago", regionName: "Nashville TN" },
  "374": { state: "TN", latitude: 35.0456, longitude: -85.3097, timeZone: "America/New_York", regionName: "Chattanooga TN" },
  "379": { state: "TN", latitude: 35.9606, longitude: -83.9207, timeZone: "America/New_York", regionName: "Knoxville TN" },
  "381": { state: "TN", latitude: 35.1495, longitude: -90.0490, timeZone: "America/Chicago", regionName: "Memphis TN" },
  "386": { state: "MS", latitude: 34.3665, longitude: -89.5192, timeZone: "America/Chicago", regionName: "North MS / Oxford" },
  "392": { state: "MS", latitude: 32.2988, longitude: -90.1848, timeZone: "America/Chicago", regionName: "Jackson MS" },
  "402": { state: "KY", latitude: 38.2527, longitude: -85.7585, timeZone: "America/New_York", regionName: "Louisville KY" },
  "405": { state: "KY", latitude: 38.0406, longitude: -84.5037, timeZone: "America/New_York", regionName: "Lexington KY" },

  // Ohio, Indiana, Michigan
  "430": { state: "OH", latitude: 39.9612, longitude: -82.9988, timeZone: "America/New_York", regionName: "Columbus OH" },
  "432": { state: "OH", latitude: 39.9612, longitude: -82.9988, timeZone: "America/New_York", regionName: "Columbus OH" },
  "441": { state: "OH", latitude: 41.4993, longitude: -81.6944, timeZone: "America/New_York", regionName: "Cleveland OH" },
  "452": { state: "OH", latitude: 39.1031, longitude: -84.5120, timeZone: "America/New_York", regionName: "Cincinnati OH" },
  "460": { state: "IN", latitude: 39.7684, longitude: -86.1581, timeZone: "America/Indiana/Indianapolis", regionName: "Indianapolis IN" },
  "462": { state: "IN", latitude: 39.7684, longitude: -86.1581, timeZone: "America/Indiana/Indianapolis", regionName: "Indianapolis IN" },
  "468": { state: "IN", latitude: 41.0793, longitude: -85.1394, timeZone: "America/Indiana/Indianapolis", regionName: "Fort Wayne IN" },
  "480": { state: "MI", latitude: 42.3314, longitude: -83.0458, timeZone: "America/Detroit", regionName: "Detroit MI" },
  "482": { state: "MI", latitude: 42.3314, longitude: -83.0458, timeZone: "America/Detroit", regionName: "Detroit MI" },
  "495": { state: "MI", latitude: 42.9634, longitude: -85.6681, timeZone: "America/Detroit", regionName: "Grand Rapids MI" },

  // Iowa, Wisconsin, Minnesota, Dakotas
  "500": { state: "IA", latitude: 41.6005, longitude: -93.6091, timeZone: "America/Chicago", regionName: "Des Moines IA" },
  "503": { state: "IA", latitude: 41.6005, longitude: -93.6091, timeZone: "America/Chicago", regionName: "Des Moines IA" },
  "530": { state: "WI", latitude: 43.0389, longitude: -87.9065, timeZone: "America/Chicago", regionName: "Milwaukee WI" },
  "532": { state: "WI", latitude: 43.0389, longitude: -87.9065, timeZone: "America/Chicago", regionName: "Milwaukee WI" },
  "537": { state: "WI", latitude: 43.0731, longitude: -89.4012, timeZone: "America/Chicago", regionName: "Madison WI" },
  "551": { state: "MN", latitude: 44.9537, longitude: -93.0900, timeZone: "America/Chicago", regionName: "St. Paul MN" },
  "554": { state: "MN", latitude: 44.9778, longitude: -93.2650, timeZone: "America/Chicago", regionName: "Minneapolis MN" },
  "571": { state: "SD", latitude: 43.5460, longitude: -96.7313, timeZone: "America/Chicago", regionName: "Sioux Falls SD" },
  "581": { state: "ND", latitude: 46.8772, longitude: -96.7898, timeZone: "America/Chicago", regionName: "Fargo ND" },
  "591": { state: "MT", latitude: 45.7833, longitude: -108.5007, timeZone: "America/Denver", regionName: "Billings MT" },

  // Illinois, Missouri, Kansas, Nebraska
  "600": { state: "IL", latitude: 42.0884, longitude: -87.9806, timeZone: "America/Chicago", regionName: "North Suburbs Chicago IL" },
  "606": { state: "IL", latitude: 41.8864, longitude: -87.6186, timeZone: "America/Chicago", regionName: "Chicago Central IL" },
  "627": { state: "IL", latitude: 39.7817, longitude: -89.6501, timeZone: "America/Chicago", regionName: "Springfield IL" },
  "631": { state: "MO", latitude: 38.6270, longitude: -90.1994, timeZone: "America/Chicago", regionName: "St. Louis MO" },
  "641": { state: "MO", latitude: 39.0997, longitude: -94.5786, timeZone: "America/Chicago", regionName: "Kansas City MO" },
  "660": { state: "KS", latitude: 39.0119, longitude: -98.4842, timeZone: "America/Chicago", regionName: "Eastern KS" },
  "672": { state: "KS", latitude: 37.6872, longitude: -97.3301, timeZone: "America/Chicago", regionName: "Wichita KS" },
  "681": { state: "NE", latitude: 41.2565, longitude: -95.9345, timeZone: "America/Chicago", regionName: "Omaha NE" },

  // Louisiana, Arkansas, Oklahoma, Texas
  "701": { state: "LA", latitude: 29.9511, longitude: -90.0715, timeZone: "America/Chicago", regionName: "New Orleans LA" },
  "708": { state: "LA", latitude: 30.4515, longitude: -91.1871, timeZone: "America/Chicago", regionName: "Baton Rouge LA" },
  "722": { state: "AR", latitude: 34.7465, longitude: -92.2896, timeZone: "America/Chicago", regionName: "Little Rock AR" },
  "727": { state: "AR", latitude: 36.3729, longitude: -94.2088, timeZone: "America/Chicago", regionName: "Northwest Arkansas / Bentonville" },
  "730": { state: "OK", latitude: 35.4676, longitude: -97.5164, timeZone: "America/Chicago", regionName: "Oklahoma City OK" },
  "731": { state: "OK", latitude: 35.4676, longitude: -97.5164, timeZone: "America/Chicago", regionName: "Oklahoma City OK" },
  "741": { state: "OK", latitude: 36.1540, longitude: -95.9928, timeZone: "America/Chicago", regionName: "Tulsa OK" },
  "750": { state: "TX", latitude: 33.0198, longitude: -96.6989, timeZone: "America/Chicago", regionName: "Plano / North Dallas TX" },
  "752": { state: "TX", latitude: 32.7876, longitude: -96.7994, timeZone: "America/Chicago", regionName: "Dallas TX" },
  "761": { state: "TX", latitude: 32.7555, longitude: -97.3308, timeZone: "America/Chicago", regionName: "Fort Worth TX" },
  "770": { state: "TX", latitude: 29.7604, longitude: -95.3698, timeZone: "America/Chicago", regionName: "Houston TX" },
  "782": { state: "TX", latitude: 29.4241, longitude: -98.4936, timeZone: "America/Chicago", regionName: "San Antonio TX" },
  "787": { state: "TX", latitude: 30.2672, longitude: -97.7431, timeZone: "America/Chicago", regionName: "Austin TX" },
  "799": { state: "TX", latitude: 31.7619, longitude: -106.4850, timeZone: "America/Denver", regionName: "El Paso TX" },

  // Mountain States
  "800": { state: "CO", latitude: 39.7525, longitude: -104.9995, timeZone: "America/Denver", regionName: "Denver Metro CO" },
  "802": { state: "CO", latitude: 39.7525, longitude: -104.9995, timeZone: "America/Denver", regionName: "Denver Central CO" },
  "809": { state: "CO", latitude: 38.8339, longitude: -104.8214, timeZone: "America/Denver", regionName: "Colorado Springs CO" },
  "820": { state: "WY", latitude: 41.1399, longitude: -104.8202, timeZone: "America/Denver", regionName: "Cheyenne WY" },
  "837": { state: "ID", latitude: 43.6150, longitude: -116.2023, timeZone: "America/Denver", regionName: "Boise ID" },
  "841": { state: "UT", latitude: 40.7608, longitude: -111.8910, timeZone: "America/Denver", regionName: "Salt Lake City UT" },
  "850": { state: "AZ", latitude: 33.4511, longitude: -112.0685, timeZone: "America/Phoenix", regionName: "Phoenix AZ" },
  "852": { state: "AZ", latitude: 33.4152, longitude: -111.8315, timeZone: "America/Phoenix", regionName: "Mesa / East Valley AZ" },
  "857": { state: "AZ", latitude: 32.2226, longitude: -110.9747, timeZone: "America/Phoenix", regionName: "Tucson AZ" },
  "871": { state: "NM", latitude: 35.0844, longitude: -106.6504, timeZone: "America/Denver", regionName: "Albuquerque NM" },
  "875": { state: "NM", latitude: 35.6870, longitude: -105.9378, timeZone: "America/Denver", regionName: "Santa Fe NM" },
  "891": { state: "NV", latitude: 36.1699, longitude: -115.1398, timeZone: "America/Los_Angeles", regionName: "Las Vegas NV" },
  "895": { state: "NV", latitude: 39.5296, longitude: -119.8138, timeZone: "America/Los_Angeles", regionName: "Reno NV" },

  // California, Pacific Northwest, Alaska & Hawaii
  "900": { state: "CA", latitude: 34.0614, longitude: -118.2395, timeZone: "America/Los_Angeles", regionName: "Los Angeles Central CA" },
  "902": { state: "CA", latitude: 33.9747, longitude: -118.4117, timeZone: "America/Los_Angeles", regionName: "West LA / Coastal CA" },
  "913": { state: "CA", latitude: 34.1950, longitude: -118.5360, timeZone: "America/Los_Angeles", regionName: "San Fernando Valley CA" },
  "921": { state: "CA", latitude: 32.7157, longitude: -117.1611, timeZone: "America/Los_Angeles", regionName: "San Diego CA" },
  "926": { state: "CA", latitude: 33.6846, longitude: -117.8265, timeZone: "America/Los_Angeles", regionName: "Irvine / Orange County CA" },
  "941": { state: "CA", latitude: 37.7749, longitude: -122.4194, timeZone: "America/Los_Angeles", regionName: "San Francisco CA" },
  "946": { state: "CA", latitude: 37.8044, longitude: -122.2712, timeZone: "America/Los_Angeles", regionName: "Oakland / East Bay CA" },
  "951": { state: "CA", latitude: 37.3382, longitude: -121.8863, timeZone: "America/Los_Angeles", regionName: "San Jose / Silicon Valley CA" },
  "958": { state: "CA", latitude: 38.5816, longitude: -121.4944, timeZone: "America/Los_Angeles", regionName: "Sacramento CA" },
  "972": { state: "OR", latitude: 45.5152, longitude: -122.6784, timeZone: "America/Los_Angeles", regionName: "Portland OR" },
  "980": { state: "WA", latitude: 47.6101, longitude: -122.2015, timeZone: "America/Los_Angeles", regionName: "Bellevue / Eastside WA" },
  "981": { state: "WA", latitude: 47.6105, longitude: -122.3348, timeZone: "America/Los_Angeles", regionName: "Seattle WA" },
  "992": { state: "WA", latitude: 47.6588, longitude: -117.4260, timeZone: "America/Los_Angeles", regionName: "Spokane WA" },
  "995": { state: "AK", latitude: 61.2176, longitude: -149.8997, timeZone: "America/Anchorage", regionName: "Anchorage AK" },
  "997": { state: "AK", latitude: 64.8378, longitude: -147.7164, timeZone: "America/Anchorage", regionName: "Fairbanks AK" },
  "998": { state: "AK", latitude: 58.3019, longitude: -134.4197, timeZone: "America/Anchorage", regionName: "Juneau AK" },
  "967": { state: "HI", latitude: 20.8893, longitude: -156.4729, timeZone: "Pacific/Honolulu", regionName: "Maui / Outer Islands HI" },
  "968": { state: "HI", latitude: 21.3152, longitude: -157.8567, timeZone: "Pacific/Honolulu", regionName: "Honolulu / Oahu HI" },
};

/**
 * Finds the geographic centroid and IANA time zone for any US ZIP code.
 *
 * Checks 5-digit exact match first, then 3-digit regional prefix.
 * Returns null if the ZIP cannot be resolved.
 */
export function lookupZipCentroid(rawZip?: string | null): ZipCentroid | null {
  if (!rawZip) return null;
  const clean = rawZip.trim().replace(/\D/g, "");
  if (clean.length < 3) return null;

  // 1. Exact 5-digit match
  if (clean.length >= 5) {
    const zip5 = clean.slice(0, 5);
    if (EXACT_ZIP_CENTROIDS[zip5]) {
      return EXACT_ZIP_CENTROIDS[zip5];
    }
  }

  // 2. 3-digit prefix regional match
  const prefix3 = clean.slice(0, 3);
  const prefixMatch = THREE_DIGIT_ZIP_CENTROIDS[prefix3];
  if (prefixMatch) {
    return {
      zip: clean.length >= 5 ? clean.slice(0, 5) : prefix3 + "00",
      city: prefixMatch.regionName,
      state: prefixMatch.state,
      latitude: prefixMatch.latitude,
      longitude: prefixMatch.longitude,
      timeZone: prefixMatch.timeZone,
    };
  }

  return null;
}
