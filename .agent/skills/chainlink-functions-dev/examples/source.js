// This code is executed on the Chainlink Functions DON.
// It fetches data from the Star Wars API (SWAPI).

const characterId = args[0];

if (!characterId) {
  throw Error("Character ID is required");
}

console.log(`Sending HTTP request to fetch character ${characterId}...`);

const apiResponse = await Functions.makeHttpRequest({
  url: `https://swapi.dev/api/people/${characterId}/`,
});

if (apiResponse.error) {
  console.error(apiResponse.error);
  throw Error('Request failed');
}

const { data } = apiResponse;

console.log(`Fetched character: ${data.name}`);

// Return the character name as a string (encoded as bytes)
return Functions.encodeString(data.name);
