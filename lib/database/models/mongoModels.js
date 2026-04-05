const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		passwordHash: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

const todoSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		text: {
			type: String,
			required: true,
			trim: true,
		},
		completed: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

todoSchema.index({ userId: 1, createdAt: -1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Todo = mongoose.models.Todo || mongoose.model("Todo", todoSchema);

module.exports = {
	User,
	Todo,
};