const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;
const touchControls = document.getElementById("touchControls");
const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnAction = document.getElementById("btnAction");

const IS_TOUCH_DEVICE = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const IS_MOBILE_VIEW = Math.min(window.innerWidth, window.innerHeight) <= 900;
const LOW_PERF_MODE = IS_TOUCH_DEVICE || IS_MOBILE_VIEW;
const USE_TOUCH_BUTTONS = IS_TOUCH_DEVICE;

if (IS_MOBILE_VIEW) {
	canvas.width = 540;
	canvas.height = 900;
} else {
	canvas.width = 900;
	canvas.height = 450;
}

const playerImg = new Image();
playerImg.src = "assets/player.png";

const uncleImg = new Image();
uncleImg.src = "assets/uncle.png";

const auntImg = new Image();
auntImg.src = "assets/aunt.png";

const moneyImg = new Image();
moneyImg.src = "assets/money.png";

const bombImg = new Image();
bombImg.src = "assets/bomb.png";

const bulletImg = new Image();
bulletImg.src = "assets/bullet.png";

const bgImg = new Image();
bgImg.src = "assets/background.png";

const catchSound = new Audio("assets/catch.mp3");
const laughSound = new Audio("assets/laugh.mp3");
const bgMusic = new Audio("assets/bg-music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.22;
catchSound.volume = 0.28;
let lastCatchSoundTime = 0;

const W = canvas.width;
const H = canvas.height;
const UI_FONT = '"Hind Siliguri", "Noto Sans Bengali", Arial, sans-serif';
const PLAYER_NAME = "Nazmul Rahad";
const MAX_PARTICLES = LOW_PERF_MODE ? 120 : 260;
const MAX_DROPS = LOW_PERF_MODE ? 22 : 42;
const TOUCH_SENSITIVITY = LOW_PERF_MODE ? 72 : 120;
const TOUCH_DEADZONE = LOW_PERF_MODE ? 0.025 : 0.06;
const TOUCH_SPEED_BOOST = LOW_PERF_MODE ? 1.22 : 1;
const PLAYER_SPEED_BOOST = LOW_PERF_MODE ? 1.18 : 1;
const PLAYER_SIZE_MUL = IS_MOBILE_VIEW ? 1.24 : 1;
const PLAYER_BOTTOM_PADDING = IS_MOBILE_VIEW ? 18 : 10;

const game = {
	state: "ready",
	playerName: localStorage.getItem("eid-player-name") || "",
	score: 0,
	best: Number(localStorage.getItem("eid-catch-best-bn") || 0),
	lives: 5,
	level: 1,
	elapsed: 0,
	combo: 0,
	comboTimer: 0,
	message: "স্পেস চাপুন, খেলা শুরু হবে",
	messageTimer: 9999,
	wind: 0,
	targetWind: 0,
	windTimer: 0,
	spawnTimer: 0,
	screenShake: 0,
	wallet: 0,
	displayWallet: 0,
	magnetTimer: 0,
	crowdTimer: 16,
	crowdBoostTimer: 0,
	missionTarget: 10,
	missionProgress: 0,
	missionReward: 500,
	diffLevel: 2,
	stamina: 100,
	disturbTimer: 14,
	reverseTimer: 0,
	blackoutTimer: 0,
	rushTimer: 0,
	missStreak: 0,
	resultSaved: false,
	weather: "sunny",
	weatherTimer: 16,
	bombStormTimer: 0
};

const player = {
	x: W * 0.5 - 42,
	y: H - 74,
	w: 84 * PLAYER_SIZE_MUL,
	h: 64 * PLAYER_SIZE_MUL,
	vx: 0
};

player.x = W * 0.5 - player.w * 0.5;
player.y = H - player.h - PLAYER_BOTTOM_PADDING;

const keys = {
	left: false,
	right: false,
	dash: false
};

let drops = [];
let particles = [];
let cashPopups = [];
let lastTime = performance.now();
let touchMoveActive = false;
let touchTargetX = null;
let activePointerId = null;
let ambientLights = [];
let fogBands = [];
let weatherDrops = [];
const uiButtons = {
	start: null,
	restart: null,
	resume: null,
	diff1: null,
	diff2: null,
	diff3: null
};

function initVisualScene() {
	ambientLights = [];
	fogBands = [];
	weatherDrops = [];
	const lightCount = LOW_PERF_MODE ? 6 : 18;
	const fogCount = LOW_PERF_MODE ? 2 : 4;
	const weatherCount = LOW_PERF_MODE ? 20 : 80;
	for (let i = 0; i < lightCount; i++) {
		ambientLights.push({
			x: randomRange(0, W),
			y: randomRange(0, H),
			r: randomRange(16, 42),
			alpha: randomRange(0.05, 0.16),
			vx: randomRange(-8, 8),
			vy: randomRange(6, 18)
		});
	}
	for (let i = 0; i < fogCount; i++) {
		fogBands.push({
			y: 60 + i * 90,
			h: 60 + i * 10,
			speed: randomRange(8, 18),
			off: randomRange(0, Math.PI * 2),
			alpha: 0.05 + i * 0.02
		});
	}
	for (let i = 0; i < weatherCount; i++) {
		weatherDrops.push({
			x: randomRange(0, W),
			y: randomRange(0, H),
			vx: randomRange(-20, 20),
			vy: randomRange(180, 260),
			l: randomRange(10, 18)
		});
	}
}

function updateVisualScene(dt) {
	for (let i = 0; i < ambientLights.length; i++) {
		const light = ambientLights[i];
		light.x += light.vx * dt;
		light.y += light.vy * dt;
		if (light.x < -60) light.x = W + 60;
		if (light.x > W + 60) light.x = -60;
		if (light.y > H + 60) {
			light.y = -40;
			light.x = randomRange(0, W);
		}
	}

	for (let i = 0; i < weatherDrops.length; i++) {
		const p = weatherDrops[i];
		if (game.weather === "rainy") {
			p.x += (p.vx + game.wind * 0.8) * dt;
			p.y += p.vy * dt;
		} else {
			p.x += (p.vx * 0.2 + game.wind * 0.5) * dt;
			p.y += (p.vy * 0.12) * dt;
		}
		if (p.y > H + 25) {
			p.y = -20;
			p.x = randomRange(0, W);
		}
		if (p.x > W + 20) p.x = -20;
		if (p.x < -20) p.x = W + 20;
	}
}

function drawVisualScene() {
	const sky = ctx.createLinearGradient(0, 0, 0, H);
	if (game.weather === "rainy") {
		sky.addColorStop(0, "rgba(30,41,59,0.28)");
		sky.addColorStop(1, "rgba(2,6,23,0.2)");
	} else if (game.weather === "windy") {
		sky.addColorStop(0, "rgba(51,65,85,0.22)");
		sky.addColorStop(1, "rgba(2,6,23,0.14)");
	} else {
		sky.addColorStop(0, "rgba(30,41,59,0.18)");
		sky.addColorStop(1, "rgba(2,6,23,0.12)");
	}
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, W, H);

	for (let i = 0; i < fogBands.length; i++) {
		const fog = fogBands[i];
		const wave = Math.sin((game.elapsed * fog.speed * 0.08) + fog.off) * 32;
		ctx.fillStyle = `rgba(148,163,184,${fog.alpha})`;
		ctx.fillRect(-80 + wave, fog.y, W + 160, fog.h);
	}

	for (let i = 0; i < ambientLights.length; i++) {
		const light = ambientLights[i];
		ctx.globalAlpha = light.alpha;
		ctx.fillStyle = "#fef3c7";
		ctx.beginPath();
		ctx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

const funnyCatchLines = [
	"খালু বলল: আগে সালাম, পরে সালামি! 😄",
	"ফুপু হাসে: এই নাও, গোপন সালামি! 💸",
	"নানু: পড়াশোনা কেমন? এই নাও বোনাস! 🤭",
	"চাচা: ঈদ মোবারক! পকেট ভরো! 🥳",
	"ভাবি: সেমাই খেয়ে আবার ধরো! 🍮"
];

const funnyMissLines = [
	"আহারে! সালামি হাতছাড়া! 😅",
	"দূর! মামা নিয়ে গেলেন পকেটে! 😂",
	"ওরে! আগে জুতা পরে তারপর ধরো! 👟",
	"মিস! খালামণি বলল: ফিটনেস কম! 🤣"
];

function pickRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function safePlay(sound) {
	const node = sound.cloneNode();
	node.volume = 0.5;
	node.play().catch(() => {});
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
	return min + Math.random() * (max - min);
}

function setMessage(text, seconds = 1.2) {
	game.message = text;
	game.messageTimer = seconds;
}

function ensurePlayerName(forcePrompt = false) {
	if (!forcePrompt && game.playerName && game.playerName.trim()) return true;
	const inputName = window.prompt("আপনার নাম লিখুন:", localStorage.getItem("eid-player-name") || "");
	if (!inputName || !inputName.trim()) {
		setMessage("নাম না দিলে খেলা শুরু হবে না", 1.4);
		return false;
	}
	game.playerName = inputName.trim().slice(0, 24);
	localStorage.setItem("eid-player-name", game.playerName);
	setMessage(`স্বাগতম, ${game.playerName}!`, 1.2);
	return true;
}

function getLeaderboard() {
	try {
		const raw = localStorage.getItem("eid-local-leaderboard");
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}

	if (game.weather === "rainy") {
		ctx.strokeStyle = "rgba(186,230,253,0.42)";
		ctx.lineWidth = 1.2;
		for (let i = 0; i < weatherDrops.length; i++) {
			const p = weatherDrops[i];
			ctx.beginPath();
			ctx.moveTo(p.x, p.y);
			ctx.lineTo(p.x - 4, p.y + p.l);
			ctx.stroke();
		}
	}
}

function saveLeaderboard(entries) {
	localStorage.setItem("eid-local-leaderboard", JSON.stringify(entries));
}

function savePlayerResult() {
	if (game.resultSaved) return;
	if (!game.playerName) return;
	const grossSalami = Math.round(game.wallet);
	const tax = Math.round(grossSalami * 0.1);
	const netSalami = grossSalami - tax;
	const board = getLeaderboard();
	board.push({
		name: game.playerName,
		score: game.score,
		net: netSalami,
		at: Date.now()
	});
	board.sort((a, b) => b.score - a.score);
	saveLeaderboard(board.slice(0, 8));
	game.resultSaved = true;
}

function exportLeaderboardCSV() {
	const rows = getLeaderboard();
	if (!rows.length) {
		setMessage("Export করার মতো স্কোর এখনো নেই", 1.2);
		return;
	}
	const header = ["Name", "Score", "NetSalami", "Timestamp"];
	const lines = [header.join(",")];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const safeName = String(row.name || "").replace(/"/g, '""');
		const dt = new Date(row.at || Date.now()).toISOString();
		lines.push(`"${safeName}",${row.score || 0},${row.net || 0},"${dt}"`);
	}
	const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "eid-leaderboard.csv";
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
	setMessage("CSV ডাউনলোড হয়েছে (Excel এ খুলুন)", 1.4);
}

function playCatchSound() {
	const now = performance.now();
	if (now - lastCatchSoundTime < 140) return;
	lastCatchSoundTime = now;
	safePlay(catchSound);
}

function addCashPopup(x, y, amount, color = "#22c55e") {
	cashPopups.push({
		x,
		y,
		amount,
		life: 1,
		color
	});
}

function setUIButton(key, x, y, w, h) {
	uiButtons[key] = { x, y, w, h };
}

function clearUIButtons() {
	for (const key of Object.keys(uiButtons)) {
		uiButtons[key] = null;
	}
}

function drawUIBtn(x, y, w, h, text, active = false) {
	ctx.fillStyle = active ? "rgba(16,185,129,0.30)" : "rgba(255,255,255,0.12)";
	ctx.strokeStyle = active ? "rgba(52,211,153,0.95)" : "rgba(255,255,255,0.35)";
	ctx.lineWidth = 2;
	ctx.fillRect(x, y, w, h);
	ctx.strokeRect(x, y, w, h);
	ctx.fillStyle = "#fff";
	ctx.font = `bold 21px ${UI_FONT}`;
	ctx.textAlign = "center";
	ctx.fillText(text, x + w * 0.5, y + h * 0.62);
	ctx.textAlign = "start";
}

function isInsideButton(rect, x, y) {
	return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function getCanvasCoords(eventLike) {
	const rect = canvas.getBoundingClientRect();
	const clientX = eventLike.clientX;
	const clientY = eventLike.clientY;
	return {
		x: (clientX - rect.left) * (W / rect.width),
		y: (clientY - rect.top) * (H / rect.height)
	};
}

function getDifficultySettings() {
	if (game.diffLevel === 1) {
		return { label: "সহজ", lives: 5, spawnMul: 1.12, bombMul: 0.85, assistMul: 1.15 };
	}
	if (game.diffLevel === 3) {
		return { label: "কঠিন", lives: 5, spawnMul: 0.88, bombMul: 1.2, assistMul: 0.82 };
	}
	return { label: "নরমাল", lives: 5, spawnMul: 0.95, bombMul: 1.05, assistMul: 0.95 };
}

function resetGame() {
	const diff = getDifficultySettings();
	game.state = "running";
	game.score = 0;
	game.lives = diff.lives;
	game.level = 1;
	game.elapsed = 0;
	game.combo = 0;
	game.comboTimer = 0;
	game.wind = 0;
	game.targetWind = 0;
	game.windTimer = 1.5;
	game.spawnTimer = 0.6;
	game.screenShake = 0;
	game.wallet = 0;
	game.displayWallet = 0;
	game.magnetTimer = 0;
	game.crowdTimer = 16;
	game.crowdBoostTimer = 0;
	game.missionTarget = 10;
	game.missionProgress = 0;
	game.missionReward = 500;
	game.stamina = 100;
	game.disturbTimer = 14;
	game.reverseTimer = 0;
	game.blackoutTimer = 0;
	game.rushTimer = 0;
	game.missStreak = 0;
	game.resultSaved = false;
	game.weather = "sunny";
	game.weatherTimer = 16;
	game.bombStormTimer = 0;
	drops = [];
	particles = [];
	cashPopups = [];
	player.x = W * 0.5 - player.w * 0.5;
	player.y = H - player.h - PLAYER_BOTTOM_PADDING;
	player.vx = 0;
	setMessage(`${game.playerName || PLAYER_NAME} এর ${diff.label} মোড শুরু!`, 2.2);
	bgMusic.currentTime = 0;
	bgMusic.play().catch(() => {});
}

function updateBest() {
	if (game.score > game.best) {
		game.best = game.score;
		localStorage.setItem("eid-catch-best-bn", String(game.best));
	}
}

function spawnDrop() {
	if (drops.length >= MAX_DROPS) return;

	const diff = getDifficultySettings();
	const levelFactor = clamp(game.level * 0.025, 0, 0.1);
	const crowdBonus = game.crowdBoostTimer > 0 ? 0.05 : 0;
	const stormBonus = game.bombStormTimer > 0 ? 0.06 : 0;
	const bombChance = Math.max(0.03, (0.06 + levelFactor - crowdBonus + stormBonus) * diff.bombMul);
	const bulletChance = game.bombStormTimer > 0 ? 0.11 : 0.06;
	const moneyChance = 0.5 + crowdBonus;
	const roll = Math.random();

	let type = "uncle";
	if (roll < bombChance) type = "bomb";
	else if (roll < bombChance + bulletChance) type = "bullet";
	else if (roll < bombChance + bulletChance + 0.08) type = "boost";
	else if (roll < bombChance + bulletChance + 0.08 + moneyChance) type = "money";
	else if (Math.random() > 0.5) type = "aunt";

	const size = randomRange(46, 68);
	const nearPlayerSpawn = Math.random() < 0.55;
	const baseX = nearPlayerSpawn
		? player.x + player.w * 0.5 + randomRange(-150, 150)
		: randomRange(20, W - size - 20);
	const drop = {
		type,
		x: clamp(baseX, 20, W - size - 20),
		y: -size,
		px: 0,
		py: 0,
		w: size,
		h: size,
		vx: randomRange(-20, 20),
		vy: randomRange(62, 88) + game.level * 10,
		rotation: randomRange(-0.2, 0.2),
		spin: randomRange(-1.8, 1.8)
	};

	if (type === "bullet") {
		drop.w = randomRange(36, 50);
		drop.h = drop.w;
		drop.vx = randomRange(-120, 120);
		drop.vy = randomRange(180, 240) + game.level * 12;
		drop.spin = randomRange(-3.4, 3.4);
	}

	drops.push(drop);
}

function addParticles(x, y, color, amount) {
	if (particles.length >= MAX_PARTICLES) return;
	const emitCount = Math.min(amount, MAX_PARTICLES - particles.length);
	for (let i = 0; i < emitCount; i++) {
		particles.push({
			x,
			y,
			vx: randomRange(-180, 180),
			vy: randomRange(-220, -70),
			life: randomRange(0.4, 0.9),
			maxLife: randomRange(0.4, 0.9),
			size: randomRange(2, 5),
			color
		});
	}
}

function onCatch(drop) {
	if (drop.type === "bomb") {
		game.lives -= 1;
		game.combo = 0;
		game.comboTimer = 0;
		game.screenShake = 0.25;
		safePlay(laughSound);
		setMessage("💥 আইরে! বোমায় ধরা!", 1.2);
		addCashPopup(drop.x, drop.y, -120, "#ef4444");
		addParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#ef4444", 26);
		return;
	}

	if (drop.type === "bullet") {
		game.lives -= 2;
		game.combo = 0;
		game.comboTimer = 0;
		game.screenShake = 0.35;
		safePlay(laughSound);
		setMessage("🔫 বুলেট লেগেছে! ২ জীবন কমে গেছে", 1.25);
		addCashPopup(drop.x, drop.y, -240, "#ef4444");
		addParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#f87171", 30);
		return;
	}

	if (drop.type === "boost") {
		game.magnetTimer = Math.max(game.magnetTimer, 6.5);
		game.score += 140;
		game.wallet += 140;
		updateBest();
		playCatchSound();
		setMessage("🧲 ম্যাগনেট বুস্ট! ৬.৫ সেকেন্ড", 1.2);
		addCashPopup(drop.x, drop.y, 140, "#2dd4bf");
		addParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#2dd4bf", 22);
		return;
	}

	const base = drop.type === "money" ? 150 : drop.type === "uncle" ? 110 : 90;
	game.combo += 1;
	game.comboTimer = 2.2;
	const comboMultiplier = 1 + Math.min(4, Math.floor(game.combo / 4));
	const levelMultiplier = 1 + game.level * 0.05;
	const gained = Math.round(base * comboMultiplier * levelMultiplier);
	game.score += gained;
	game.wallet += gained;
	game.missionProgress += 1;
	game.missStreak = 0;
	updateBest();
	playCatchSound();
	if (game.combo >= 4) {
		setMessage(`🔥 কম্বো x${comboMultiplier}  +${gained}`, 0.95);
	} else {
		setMessage(`${pickRandom(funnyCatchLines)} +${gained}`, 1.1);
	}
	addCashPopup(drop.x + drop.w * 0.2, drop.y, gained, "#22c55e");
	addParticles(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5, "#fde047", 18);

	if (game.missionProgress >= game.missionTarget) {
		game.missionProgress = 0;
		game.score += game.missionReward;
		game.wallet += game.missionReward;
		game.lives += 1;
		setMessage(`🎯 মিশন শেষ! +৳${game.missionReward} ও +1 জীবন`, 1.5);
		addCashPopup(player.x + 20, player.y - 10, game.missionReward, "#f59e0b");
		addParticles(player.x + player.w * 0.5, player.y, "#fbbf24", 30);
		game.missionTarget += 4;
		game.missionReward += 200;
		updateBest();
	}
}

function onMiss(drop) {
	if (drop.type === "bomb") {
		game.score += 20;
		game.wallet += 20;
		game.missStreak = 0;
		updateBest();
		setMessage("🛡️ বাহ! বোমা এড়াইছো!", 0.75);
		addCashPopup(drop.x, H - 40, 20, "#60a5fa");
		addParticles(drop.x + drop.w * 0.5, H - 8, "#93c5fd", 8);
		return;
	}

	if (drop.type === "bullet") {
		setMessage("🔫 বুলেট মিস করলো, সাবধানে থাকো!", 0.9);
		return;
	}

	game.lives -= 1;
	game.missStreak += 1;
	if (game.missStreak >= 3) {
		game.lives -= 1;
		game.missStreak = 0;
		setMessage("😵 টানা ৩টা মিস! অতিরিক্ত জীবন কাটা গেল", 1.3);
	}
	game.combo = 0;
	game.comboTimer = 0;
	safePlay(laughSound);
	setMessage(pickRandom(funnyMissLines), 1);
	addParticles(drop.x + drop.w * 0.5, H - 8, "#fca5a5", 10);
}

function intersects(a, b) {
	return (
		a.x < b.x + b.w &&
		a.x + a.w > b.x &&
		a.y < b.y + b.h &&
		a.y + a.h > b.y
	);
}

function updateRunning(dt) {
	const diff = getDifficultySettings();
	game.elapsed += dt;
	game.level = Math.max(1, Math.floor(game.elapsed / 28) + 1);

	game.weatherTimer -= dt;
	if (game.weatherTimer <= 0) {
		const roll = Math.random();
		if (roll < 0.34) game.weather = "sunny";
		else if (roll < 0.68) game.weather = "rainy";
		else game.weather = "windy";
		game.weatherTimer = randomRange(12, 20);
		setMessage(game.weather === "rainy" ? "🌧️ বৃষ্টি শুরু" : game.weather === "windy" ? "💨 ঝড়ো হাওয়া" : "☀️ আবহাওয়া পরিষ্কার", 1);
	}

	if (game.bombStormTimer > 0) game.bombStormTimer -= dt;

	game.disturbTimer -= dt;
	if (game.disturbTimer <= 0) {
		if (Math.random() < 0.56) {
			game.reverseTimer = randomRange(3.5, 5);
			setMessage("📞 পাশের বাসার কল! কন্ট্রোল উল্টে গেছে!", 1.3);
		} else {
			game.blackoutTimer = randomRange(2.6, 4.2);
			setMessage("💡 লোডশেডিং! একটু অন্ধকার!", 1.3);
		}
		game.disturbTimer = randomRange(15, 23);
	}

	if (game.reverseTimer > 0) game.reverseTimer -= dt;
	if (game.blackoutTimer > 0) game.blackoutTimer -= dt;

	game.crowdTimer -= dt;
	if (game.crowdTimer <= 0) {
		game.crowdBoostTimer = 7;
		game.crowdTimer = randomRange(22, 30);
		setMessage("🛍️ ঈদ বাজার বোনাস! সালামি বেশি পড়বে", 1.4);
	}

	if (game.crowdBoostTimer > 0) {
		game.crowdBoostTimer -= dt;
	}

	if (game.rushTimer > 0) {
		game.rushTimer -= dt;
	}

	if (game.magnetTimer > 0) {
		game.magnetTimer -= dt;
	}

	game.windTimer -= dt;
	if (game.windTimer <= 0) {
		const windSpan = game.weather === "windy" ? 80 : 35;
		game.targetWind = randomRange(-windSpan, windSpan);
		game.windTimer = randomRange(2.5, 5.5);
		if (Math.random() < 0.28) {
			game.rushTimer = randomRange(3.6, 5.2);
			setMessage("⚡ ঈদের ভিড় বেড়েছে! সবকিছু একটু দ্রুত", 1.1);
		}
		if (Math.random() < 0.2) {
			game.bombStormTimer = randomRange(4, 6.2);
			setMessage("💣 বোমা স্টর্ম! সাবধানে ধরো", 1.1);
		}
	}
	game.wind += (game.targetWind - game.wind) * dt * 0.9;

	let dir = 0;
	if (keys.left) dir -= 1;
	if (keys.right) dir += 1;
	if (touchMoveActive && touchTargetX !== null) {
		const touchDelta = touchTargetX - (player.x + player.w * 0.5);
		const analogDir = clamp(touchDelta / TOUCH_SENSITIVITY, -1, 1);
		dir = Math.abs(analogDir) < TOUCH_DEADZONE ? 0 : analogDir;
	}
	if (game.reverseTimer > 0) dir *= -1;

	const isDashing = keys.dash && Math.abs(dir) > 0 && game.stamina > 1;
	if (isDashing) {
		game.stamina = Math.max(0, game.stamina - dt * 40);
	} else {
		game.stamina = Math.min(100, game.stamina + dt * 24);
	}
	const dashMul = isDashing ? 1.45 : 1;

	const touchMul = touchMoveActive ? TOUCH_SPEED_BOOST : 1;
	const accel = 1900 * dashMul * PLAYER_SPEED_BOOST * touchMul;
	const maxSpeed = 780 * dashMul * PLAYER_SPEED_BOOST * touchMul;
	player.vx += dir * accel * dt;
	player.vx *= Math.pow(0.001, dt * 0.8);
	player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
	player.x += player.vx * dt;
	player.x = clamp(player.x, 0, W - player.w);

	const crowdSpawnBoost = game.crowdBoostTimer > 0 ? 0.85 : 1;
	const rushSpawnMul = game.rushTimer > 0 ? 0.86 : 1;
	const spawnInterval = Math.max(0.34, (1.02 - game.level * 0.03) * crowdSpawnBoost * rushSpawnMul * diff.spawnMul);
	game.spawnTimer -= dt;
	let spawnSafety = 0;
	const maxSpawnPerFrame = LOW_PERF_MODE ? 2 : 4;
	while (game.spawnTimer <= 0) {
		spawnDrop();
		game.spawnTimer += spawnInterval * randomRange(0.9, 1.1);
		spawnSafety += 1;
		if (spawnSafety >= maxSpawnPerFrame) {
			game.spawnTimer = Math.max(game.spawnTimer, spawnInterval * 0.25);
			break;
		}
	}

	const playerHitbox = {
		x: player.x + 5,
		y: player.y + 6,
		w: player.w - 10,
		h: player.h - 8
	};

	for (let i = drops.length - 1; i >= 0; i--) {
		const drop = drops[i];
		drop.px = drop.x;
		drop.py = drop.y;
		drop.vx += game.wind * dt * 0.25;
		drop.vx *= 1 - 0.15 * dt;
		let gravity = game.rushTimer > 0 ? 168 : 138;
		if (game.weather === "rainy") gravity += 36;
		drop.vy += gravity * dt;

		if (game.magnetTimer > 0 && drop.type !== "bomb") {
			const dx = (player.x + player.w * 0.5) - (drop.x + drop.w * 0.5);
			const dy = (player.y + player.h * 0.5) - (drop.y + drop.h * 0.5);
			const dist = Math.hypot(dx, dy);
			if (dist < 260) {
				drop.vx += dx * dt * 3.4;
				drop.vy += dy * dt * 2.1;
			}
		}

		if (drop.type !== "bomb" && drop.y > H - 170) {
			drop.vx += ((player.x + player.w * 0.5) - (drop.x + drop.w * 0.5)) * dt * (0.9 * diff.assistMul);
		}
		drop.x += drop.vx * dt;
		drop.y += drop.vy * dt;
		drop.rotation += drop.spin * dt;

		if (intersects(drop, playerHitbox)) {
			onCatch(drop);
			drops.splice(i, 1);
			continue;
		}

		if (drop.y > H + 50) {
			onMiss(drop);
			drops.splice(i, 1);
		}
	}

	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		p.life -= dt;
		p.vy += 380 * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		if (p.life <= 0) particles.splice(i, 1);
	}

	for (let i = cashPopups.length - 1; i >= 0; i--) {
		const popup = cashPopups[i];
		popup.life -= dt * 1.2;
		popup.y -= dt * 72;
		if (popup.life <= 0) cashPopups.splice(i, 1);
	}

	game.displayWallet += (game.wallet - game.displayWallet) * Math.min(1, dt * 10);

	if (game.comboTimer > 0) {
		game.comboTimer -= dt;
		if (game.comboTimer <= 0) game.combo = 0;
	}

	if (game.messageTimer > 0 && game.messageTimer < 5000) {
		game.messageTimer -= dt;
	}

	if (game.screenShake > 0) {
		game.screenShake -= dt;
	}

	if (game.lives <= 0) {
		game.state = "over";
		setMessage("খেলা শেষ! 😵", 9999);
		bgMusic.pause();
		savePlayerResult();
		updateBest();
	}
}

function drawDrop(drop) {
	if (drop.type === "bullet") {
		ctx.save();
		ctx.globalAlpha = 0.2;
		ctx.strokeStyle = "#f87171";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5);
		ctx.lineTo(drop.x - 22, drop.y + drop.h * 0.5);
		ctx.stroke();
		ctx.restore();

		ctx.save();
		ctx.translate(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5);
		ctx.rotate(drop.rotation);
		ctx.drawImage(bulletImg, -drop.w * 0.5, -drop.h * 0.5, drop.w, drop.h);
		ctx.restore();
		return;
	}

	if (drop.type === "boost") {
		ctx.save();
		ctx.translate(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5);
		ctx.rotate(drop.rotation);
		ctx.globalAlpha = 0.32;
		ctx.fillStyle = "#14b8a6";
		ctx.beginPath();
		ctx.arc(0, 0, drop.w * 0.55, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.drawImage(moneyImg, -drop.w * 0.5, -drop.h * 0.5, drop.w, drop.h);
		ctx.fillStyle = "#ecfeff";
		ctx.font = `bold 16px ${UI_FONT}`;
		ctx.fillText("বুস্ট", -22, 6);
		ctx.restore();
		return;
	}

	let img = uncleImg;
	if (drop.type === "aunt") img = auntImg;
	if (drop.type === "money") img = moneyImg;
	if (drop.type === "bomb") img = bombImg;

	ctx.save();
	ctx.globalAlpha = 0.22;
	ctx.strokeStyle = drop.type === "bomb" ? "#ef4444" : "#a7f3d0";
	ctx.lineWidth = 2;
	if (!LOW_PERF_MODE) {
		ctx.beginPath();
		ctx.moveTo(drop.px + drop.w * 0.5, drop.py + drop.h * 0.5);
		ctx.lineTo(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5);
		ctx.stroke();
	}
	ctx.restore();

	ctx.save();
	ctx.translate(drop.x + drop.w * 0.5, drop.y + drop.h * 0.5);
	ctx.rotate(drop.rotation);
	ctx.globalAlpha = 0.28;
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.ellipse(0, drop.h * 0.45, drop.w * 0.28, drop.h * 0.12, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.drawImage(img, -drop.w * 0.5, -drop.h * 0.5, drop.w, drop.h);
	ctx.globalAlpha = 0.14;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(-drop.w * 0.12, -drop.h * 0.12, drop.w * 0.18, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function drawParticles() {
	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const alpha = clamp(p.life / p.maxLife, 0, 1);
		ctx.globalAlpha = alpha;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function drawCashPopups() {
	for (let i = 0; i < cashPopups.length; i++) {
		const popup = cashPopups[i];
		const rise = 1 + (1 - popup.life) * 0.25;
		ctx.globalAlpha = clamp(0.25 + popup.life, 0, 1);
		ctx.fillStyle = popup.color;
		ctx.font = `bold ${Math.round(24 * rise)}px ${UI_FONT}`;
		const sign = popup.amount >= 0 ? "+" : "";
		ctx.fillText(`${sign}৳${popup.amount}`, popup.x, popup.y);
	}
	ctx.globalAlpha = 1;
}

function drawHud() {
	ctx.fillStyle = "rgba(0,0,0,0.42)";
	ctx.fillRect(10, 10, 430, 140);
	ctx.strokeStyle = "rgba(255,255,255,0.18)";
	ctx.strokeRect(10, 10, 430, 140);

	ctx.fillStyle = "#fff";
	ctx.font = `bold 20px ${UI_FONT}`;
	ctx.fillText(`স্কোর: ${game.score}`, 20, 38);
	ctx.fillText(`সেরা: ${game.best}`, 20, 64);
	ctx.fillText(`সালামি টাকা: ৳${Math.round(game.displayWallet)}`, 20, 94);
	ctx.font = `bold 16px ${UI_FONT}`;
	ctx.fillStyle = "#d1fae5";
	ctx.fillText(`মোড: ${getDifficultySettings().label}`, 20, 136);

	ctx.fillStyle = "#fde68a";
	ctx.font = `bold 18px ${UI_FONT}`;
	ctx.fillText(`লেভেল ${game.level}`, 260, 38);

	ctx.fillStyle = "#86efac";
	ctx.font = `bold 16px ${UI_FONT}`;
	ctx.fillText(`মিশন: ${game.missionProgress}/${game.missionTarget}`, 20, 116);
	if (game.magnetTimer > 0) {
		ctx.fillStyle = "#2dd4bf";
		ctx.fillText(`ম্যাগনেট: ${game.magnetTimer.toFixed(1)}s`, 260, 116);
	}
	if (game.crowdBoostTimer > 0) {
		ctx.fillStyle = "#f59e0b";
		ctx.fillText("ঈদ বাজার বোনাস চলছে!", 260, 138);
	}
	if (game.rushTimer > 0) {
		ctx.fillStyle = "#fca5a5";
		ctx.fillText(`ভিড় মোড: ${game.rushTimer.toFixed(1)}s`, 20, 22);
	}
	if (game.bombStormTimer > 0) {
		ctx.fillStyle = "#fb7185";
		ctx.fillText(`বোমা স্টর্ম: ${game.bombStormTimer.toFixed(1)}s`, 20, 154);
	}
	ctx.fillStyle = "#bfdbfe";
	ctx.fillText(`আবহাওয়া: ${game.weather === "rainy" ? "বৃষ্টি" : game.weather === "windy" ? "ঝড়ো" : "রৌদ্র"}`, 260, 154);

	ctx.fillStyle = "#e5e7eb";
	ctx.fillText(`স্ট্যামিনা: ${Math.round(game.stamina)}%`, 260, 22);

	const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.03;
	ctx.save();
	ctx.translate(W - 260, 12);
	ctx.scale(pulse, pulse);
	ctx.fillStyle = "rgba(16,185,129,0.22)";
	ctx.fillRect(0, 0, 240, 58);
	ctx.strokeStyle = "rgba(52,211,153,0.8)";
	ctx.strokeRect(0, 0, 240, 58);
	ctx.fillStyle = "#ecfccb";
	ctx.font = `bold 18px ${UI_FONT}`;
	ctx.fillText("💸 ঈদের সালামি", 12, 24);
	ctx.font = `bold 24px ${UI_FONT}`;
	ctx.fillText(`৳${Math.round(game.displayWallet)}`, 12, 50);
	ctx.restore();

	const windLabel = game.wind > 8 ? "→" : game.wind < -8 ? "←" : "·";
	ctx.fillStyle = "#93c5fd";
	ctx.fillText(`বাতাস ${windLabel} ${Math.round(Math.abs(game.wind))}`, 260, 64);

	const hearts = "❤️".repeat(Math.max(0, game.lives));
	ctx.fillStyle = "#fda4af";
	ctx.font = `20px ${UI_FONT}`;
	ctx.fillText(hearts || "0", 260, 94);

	if (game.combo >= 3 && game.state === "running") {
		const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.06;
		ctx.save();
		ctx.translate(W - 200, 54);
		ctx.scale(pulse, pulse);
		ctx.fillStyle = "#facc15";
		ctx.font = `bold 28px ${UI_FONT}`;
		ctx.fillText(`কম্বো x${1 + Math.min(4, Math.floor(game.combo / 4))}`, 0, 0);
		ctx.restore();
	}
}

function drawOverlay() {
	clearUIButtons();
	if (game.state === "running") return;

	ctx.fillStyle = "rgba(0,0,0,0.60)";
	ctx.fillRect(0, 0, W, H);

	const cardW = Math.min(650, W - 28);
	const cardH = game.state === "over" ? 350 : 320;
	const cardX = (W - cardW) * 0.5;
	const cardY = (H - cardH) * 0.5;

	ctx.fillStyle = "rgba(15,23,42,0.90)";
	ctx.strokeStyle = "rgba(196,132,252,0.8)";
	ctx.lineWidth = 3;
	ctx.fillRect(cardX, cardY, cardW, cardH);
	ctx.strokeRect(cardX, cardY, cardW, cardH);

	ctx.fillStyle = "#fff";
	ctx.textAlign = "center";
	ctx.shadowColor = "rgba(0,0,0,0.8)";
	ctx.shadowBlur = 8;
	ctx.font = `bold ${W < 700 ? 36 : 46}px ${UI_FONT}`;
	if (game.state === "ready") ctx.fillText("ঈদ সালামি ধরো", W * 0.5, cardY + 58);
	if (game.state === "paused") ctx.fillText("বিরতি", W * 0.5, cardY + 58);
	if (game.state === "over") ctx.fillText("খেলা শেষ", W * 0.5, cardY + 58);

	ctx.font = `bold ${W < 700 ? 19 : 22}px ${UI_FONT}`;
	if (game.state === "ready") {
		ctx.fillStyle = "#bfdbfe";
		ctx.fillText(` dev Author : ${PLAYER_NAME}`, W * 0.5, cardY + 98);
		ctx.fillText(`খেলোয়াড়: ${game.playerName || "(নাম দিন)"}`, W * 0.5, cardY + 126);
		ctx.fillStyle = "#ffffff";
		ctx.fillText("N চাপলে নতুন নাম দিন", W * 0.5, cardY + 154);
		ctx.fillText("মোড বেছে নিন:", W * 0.5, cardY + 180);

		const diffGap = 14;
		const sidePad = 18;
		const diffW = (cardW - sidePad * 2 - diffGap * 2) / 3;
		const diffY = cardY + 196;
		drawUIBtn(cardX + sidePad, diffY, diffW, 44, "সহজ", game.diffLevel === 1);
		drawUIBtn(cardX + sidePad + diffW + diffGap, diffY, diffW, 44, "নরমাল", game.diffLevel === 2);
		drawUIBtn(cardX + sidePad + (diffW + diffGap) * 2, diffY, diffW, 44, "কঠিন", game.diffLevel === 3);
		setUIButton("diff1", cardX + sidePad, diffY, diffW, 44);
		setUIButton("diff2", cardX + sidePad + diffW + diffGap, diffY, diffW, 44);
		setUIButton("diff3", cardX + sidePad + (diffW + diffGap) * 2, diffY, diffW, 44);

		const startW = Math.min(220, cardW - 70);
		const startX = cardX + (cardW - startW) * 0.5;
		drawUIBtn(startX, cardY + 250, startW, 54, "খেলা শুরু", true);
		setUIButton("start", startX, cardY + 250, startW, 54);
	}

	if (game.state === "paused") {
		ctx.fillStyle = "#ffffff";
		ctx.fillText("Space বা নিচের বাটনে চাপুন", W * 0.5, cardY + 140);
		drawUIBtn(cardX + 225, cardY + 220, 200, 54, "আবার শুরু", true);
		setUIButton("resume", cardX + 225, cardY + 220, 200, 54);
	}

	if (game.state === "over") {
		const grossSalami = Math.round(game.wallet);
		const tax = Math.round(grossSalami * 0.1);
		const netSalami = grossSalami - tax;
		const board = getLeaderboard();
		ctx.fillStyle = "#ffffff";
		ctx.fillText(`শেষ স্কোর: ${game.score}`, W * 0.5, cardY + 112);
		ctx.fillStyle = "#a7f3d0";
		ctx.fillText(`সালামি এসেছে: ৳${grossSalami}`, W * 0.5, cardY + 152);
		ctx.fillStyle = "#fecaca";
		ctx.fillText(`১০% ট্যাক্স কেটে নিলেন দশনেতা: ৳${tax}`, W * 0.5, cardY + 188);
		ctx.fillStyle = "#fde68a";
		ctx.fillText(`হাতে থাকলো: ৳${netSalami}`, W * 0.5, cardY + 224);
		if (board.length > 0) {
			const top = board[0];
			ctx.fillStyle = "#bfdbfe";
			ctx.font = `bold 20px ${UI_FONT}`;
			ctx.fillText(`লোকাল টপ: ${top.name} (${top.score})`, W * 0.5, cardY + 252);
		}

		drawUIBtn(cardX + 225, cardY + 280, 200, 54, "আবার খেলুন", true);
		setUIButton("restart", cardX + 225, cardY + 280, 200, 54);
	}

	ctx.shadowBlur = 0;
	ctx.textAlign = "start";
}

function render() {
	const shakeAmount = game.screenShake > 0 ? game.screenShake * 16 : 0;
	const sx = shakeAmount > 0 ? randomRange(-shakeAmount, shakeAmount) : 0;
	const sy = shakeAmount > 0 ? randomRange(-shakeAmount, shakeAmount) : 0;

	ctx.save();
	ctx.translate(sx, sy);

	ctx.clearRect(-20, -20, W + 40, H + 40);
	ctx.drawImage(bgImg, 0, 0, W, H);
	drawVisualScene();

	const dusk = clamp((game.level - 1) / 10, 0, 0.4);
	ctx.fillStyle = `rgba(10,15,35,${dusk})`;
	ctx.fillRect(0, 0, W, H);

	if (game.blackoutTimer > 0) {
		const dark = 0.28 + Math.sin(performance.now() * 0.03) * 0.1;
		ctx.fillStyle = `rgba(0,0,0,${clamp(dark, 0.18, 0.42)})`;
		ctx.fillRect(0, 0, W, H);
	}

	for (let i = 0; i < drops.length; i++) {
		drawDrop(drops[i]);
	}

	ctx.globalAlpha = 0.25;
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.ellipse(player.x + player.w * 0.5, player.y + player.h + 6, player.w * 0.4, 10, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;

	const playerTilt = clamp(player.vx / 1400, -0.16, 0.16);
	const playerStretch = 1 + Math.min(0.08, Math.abs(player.vx) / 2600);
	ctx.save();
	ctx.translate(player.x + player.w * 0.5, player.y + player.h * 0.5);
	ctx.rotate(playerTilt);
	ctx.scale(playerStretch, 1 / playerStretch);
	ctx.drawImage(playerImg, -player.w * 0.5, -player.h * 0.5, player.w, player.h);
	ctx.restore();

	if (!LOW_PERF_MODE) {
		const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, 110, W * 0.5, H * 0.5, W * 0.72);
		vignette.addColorStop(0, "rgba(0,0,0,0)");
		vignette.addColorStop(1, "rgba(0,0,0,0.28)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, W, H);
	}

	drawParticles();
	drawCashPopups();
	drawHud();

	if (game.messageTimer > 0) {
		const alpha = game.messageTimer > 5000 ? 1 : clamp(game.messageTimer / 1.2, 0.82, 1);
		const t = performance.now() * 0.006;
		const slideY = 250 + Math.sin(t) * 3;
		ctx.globalAlpha = alpha;
		ctx.fillStyle = "rgba(0,0,0,0.72)";
		ctx.fillRect(W * 0.5 - 290, slideY, 580, 62);
		ctx.strokeStyle = "rgba(255,255,255,0.38)";
		ctx.strokeRect(W * 0.5 - 290, slideY, 580, 62);
		if (!LOW_PERF_MODE) {
			ctx.shadowColor = "rgba(0,0,0,0.9)";
			ctx.shadowBlur = 6;
		}
		ctx.fillStyle = "#ecfeff";
		ctx.font = `bold 30px ${UI_FONT}`;
		ctx.fillText(game.message, W * 0.5 - 265, slideY + 41);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	drawOverlay();
	ctx.restore();
}

function frame(now) {
	const dt = clamp((now - lastTime) / 1000, 0, LOW_PERF_MODE ? 0.02 : 0.025);
	lastTime = now;
	updateVisualScene(dt);

	if (game.state === "running") {
		updateRunning(dt);
	}
	render();
	requestAnimationFrame(frame);
}

function handleAction() {
	if (!ensurePlayerName() && game.state === "ready") return;
	if (game.state === "ready") {
		resetGame();
		return;
	}
	if (game.state === "paused") {
		game.state = "running";
		setMessage("চলো! আবার সালামি ধরা শুরু 😎", 1);
		bgMusic.play().catch(() => {});
		return;
	}
	if (game.state === "over") {
		resetGame();
	}
}

function setTouchDirectionByX(x) {
	touchTargetX = clamp(x, 0, W);
}

function clearTouchInput() {
	touchMoveActive = false;
	touchTargetX = null;
	activePointerId = null;
	keys.left = false;
	keys.right = false;
}

function handleOverlayPointer(x, y) {
	if (game.state === "ready") {
		if (isInsideButton(uiButtons.diff1, x, y)) {
			game.diffLevel = 1;
			setMessage("সহজ মোড সিলেক্ট হয়েছে", 1.1);
			return true;
		}
		if (isInsideButton(uiButtons.diff2, x, y)) {
			game.diffLevel = 2;
			setMessage("নরমাল মোড সিলেক্ট হয়েছে", 1.1);
			return true;
		}
		if (isInsideButton(uiButtons.diff3, x, y)) {
			game.diffLevel = 3;
			setMessage("কঠিন মোড সিলেক্ট হয়েছে", 1.1);
			return true;
		}
		if (isInsideButton(uiButtons.start, x, y)) {
			handleAction();
			return true;
		}
	}

	if (game.state === "paused" && isInsideButton(uiButtons.resume, x, y)) {
		handleAction();
		return true;
	}

	if (game.state === "over" && isInsideButton(uiButtons.restart, x, y)) {
		handleAction();
		return true;
	}

	return false;
}

document.addEventListener("keydown", (e) => {
	if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
	if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
	if (e.key === "Shift") keys.dash = true;

	if (game.state === "ready") {
		if (e.key === "n" || e.key === "N") {
			ensurePlayerName(true);
		}
		if (e.key === "1") {
			game.diffLevel = 1;
			setMessage("সহজ মোড সিলেক্ট হয়েছে", 1.1);
		}
		if (e.key === "2") {
			game.diffLevel = 2;
			setMessage("নরমাল মোড সিলেক্ট হয়েছে", 1.1);
		}
		if (e.key === "3") {
			game.diffLevel = 3;
			setMessage("কঠিন মোড সিলেক্ট হয়েছে", 1.1);
		}
	}

	if (e.key === " " || e.code === "Space") {
		e.preventDefault();
		if (game.state === "running") {
			game.state = "paused";
			setMessage("বিরতি", 9999);
			bgMusic.pause();
		} else {
			handleAction();
		}
	}

	if ((e.key === "r" || e.key === "R") && game.state === "over") {
		resetGame();
	}
});

document.addEventListener("keyup", (e) => {
	if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
	if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
	if (e.key === "Shift") keys.dash = false;
});

canvas.addEventListener("pointerdown", (e) => {
	const p = getCanvasCoords(e);
	if (game.state !== "running") {
		handleOverlayPointer(p.x, p.y);
		return;
	}
	if (USE_TOUCH_BUTTONS) return;
	touchMoveActive = true;
	activePointerId = e.pointerId;
	try {
		canvas.setPointerCapture(e.pointerId);
	} catch {}
	setTouchDirectionByX(p.x);
});

canvas.addEventListener("pointermove", (e) => {
	if (USE_TOUCH_BUTTONS) return;
	if (activePointerId !== null && e.pointerId !== activePointerId) return;
	if (!touchMoveActive || game.state !== "running") return;
	const p = getCanvasCoords(e);
	setTouchDirectionByX(p.x);
});

canvas.addEventListener("pointerup", (e) => {
	if (activePointerId !== null && e.pointerId !== activePointerId) return;
	try {
		canvas.releasePointerCapture(e.pointerId);
	} catch {}
	clearTouchInput();
});

canvas.addEventListener("pointercancel", (e) => {
	if (activePointerId !== null && e.pointerId !== activePointerId) return;
	clearTouchInput();
});

canvas.addEventListener("pointerleave", () => {
	if (game.state === "running") clearTouchInput();
});

canvas.addEventListener("pointerout", () => {
	if (game.state === "running") clearTouchInput();
});

if (!window.PointerEvent) {
	canvas.addEventListener("touchstart", (e) => {
		if (USE_TOUCH_BUTTONS) return;
		const t = e.touches[0];
		if (!t) return;
		const p = getCanvasCoords(t);
		if (game.state !== "running") {
			handleOverlayPointer(p.x, p.y);
			return;
		}
		touchMoveActive = true;
		setTouchDirectionByX(p.x);
	}, { passive: true });

	canvas.addEventListener("touchmove", (e) => {
		if (USE_TOUCH_BUTTONS) return;
		if (!touchMoveActive || game.state !== "running") return;
		const t = e.touches[0];
		if (!t) return;
		const p = getCanvasCoords(t);
		setTouchDirectionByX(p.x);
	}, { passive: true });

	canvas.addEventListener("touchend", clearTouchInput, { passive: true });
	canvas.addEventListener("touchcancel", clearTouchInput, { passive: true });
}

function setTouchBtnPressed(button, pressed) {
	if (!button) return;
	button.classList.toggle("pressed", pressed);
}

function bindTouchHoldButton(button, key) {
	if (!button) return;
	button.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		setTouchBtnPressed(button, true);
		keys[key] = true;
		try {
			button.setPointerCapture(e.pointerId);
		} catch {}
	}, { passive: false });

	const release = () => {
		keys[key] = false;
		setTouchBtnPressed(button, false);
	};

	button.addEventListener("pointerup", release);
	button.addEventListener("pointercancel", release);
	button.addEventListener("pointerleave", release);
	button.addEventListener("lostpointercapture", release);
}

if (USE_TOUCH_BUTTONS && touchControls) {
	touchControls.style.display = "flex";
	bindTouchHoldButton(btnLeft, "left");
	bindTouchHoldButton(btnRight, "right");

	if (btnAction) {
		btnAction.addEventListener("click", (e) => {
			e.preventDefault();
			if (game.state === "running") {
				game.state = "paused";
				setMessage("বিরতি", 9999);
				bgMusic.pause();
			} else {
				handleAction();
			}
		});
	}
}

initVisualScene();

requestAnimationFrame(frame);