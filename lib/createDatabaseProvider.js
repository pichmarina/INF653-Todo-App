const MongoDBProvider = require("./database/MongoDBProvider");
const SupabaseProvider = require("./database/SupabaseProvider");

async function createDatabaseProvider() {
	const providerKey = (process.env.DB_TYPE || "mongodb").trim().toLowerCase();

	let provider;

	if (providerKey === "mongodb") {
		provider = new MongoDBProvider();
	} else if (providerKey === "supabase") {
		provider = new SupabaseProvider();
	} else {
		throw new Error(
			`Unknown database provider: "${providerKey}". Expected "mongodb" or "supabase"`
		);
	}

	await provider.connect();
	return provider;
}

module.exports = createDatabaseProvider;