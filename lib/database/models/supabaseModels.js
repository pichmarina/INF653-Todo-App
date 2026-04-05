const SUPABASE_TABLES = Object.freeze({
	USERS: "users",
	TODOS: "todos",
});

function toIdString(value) {
	return String(value);
}

function mapUserRowToModel(row) {
	if (!row) {
		return null;
	}

	return {
		_id: toIdString(row.id),
		id: toIdString(row.id),
		email: row.email,
		passwordHash: row.password_hash,
		createdAt: row.created_at,
	};
}

function mapTodoRowToModel(row) {
	if (!row) {
		return null;
	}

	return {
		_id: toIdString(row.id),
		id: toIdString(row.id),
		userId: toIdString(row.user_id),
		text: row.text,
		completed: row.completed,
		createdAt: row.created_at,
	};
}

module.exports = {
	SUPABASE_TABLES,
	mapUserRowToModel,
	mapTodoRowToModel,
};