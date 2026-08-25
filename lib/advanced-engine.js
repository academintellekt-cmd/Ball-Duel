const FIELD_SIZE = 15;
const CATCH_COLORS = ['orange', 'blue', 'green', 'pink'];

class AdvancedGameEngine {
  constructor(random = Math.random) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.mode = '';
    this.scores = [0, 0];
    this.paintOwners = Array(FIELD_SIZE).fill(-1);
    this.paintRound = 1;
    this.catchVariant = 'fill';
    this.catchDifficulty = 'easy';
    this.catchFilled = [new Set(), new Set()];
    this.catchTargets = [null, null];
    this.intersection = [null, null];
    this.pong = null;
  }

  randomPosition(excluded = new Set()) {
    const choices = Array.from({ length: FIELD_SIZE }, (_, i) => i + 1).filter(x => !excluded.has(x));
    return choices[Math.floor(this.random() * choices.length)] || 1;
  }

  startPaint() {
    this.reset();
    this.mode = 'paint';
    return this.paintOwners;
  }

  paint(player, position) {
    if (this.mode !== 'paint' || ![0, 1].includes(player) || position < 1 || position > FIELD_SIZE) return false;
    this.paintOwners[position - 1] = player;
    return true;
  }

  finishPaintRound() {
    const counts = [this.paintOwners.filter(x => x === 0).length, this.paintOwners.filter(x => x === 1).length];
    if (counts[0] !== counts[1]) this.scores[counts[0] > counts[1] ? 0 : 1]++;
    const result = { round: this.paintRound, counts, scores: [...this.scores] };
    this.paintRound++;
    this.paintOwners.fill(-1);
    return result;
  }

  catchInterval(difficulty) {
    return ({ easy: 300, medium: 250, hard: 200, veryHard: 200 })[difficulty] || 300;
  }

  startCatch(variant = 'fill', difficulty = 'easy', now = Date.now()) {
    this.reset();
    this.mode = 'catchColor';
    this.catchVariant = variant;
    this.catchDifficulty = difficulty;
    this.catchIntervalMs = this.catchInterval(difficulty);
    this.nextCatch(0, now);
    this.nextCatch(1, now);
    return this.catchTargets;
  }

  nextCatch(player, now = Date.now()) {
    const excluded = this.catchVariant === 'fill' ? this.catchFilled[player] : new Set();
    if (excluded.size >= FIELD_SIZE) return null;
    const position = this.randomPosition(excluded);
    const phase = Math.floor(this.random() * CATCH_COLORS.length);
    this.catchTargets[player] = { position, phase, startedAt: now };
    return this.catchTargets[player];
  }

  catchColorAt(player, now = Date.now()) {
    const target = this.catchTargets[player];
    if (!target) return null;
    const step = Math.floor((now - target.startedAt) / this.catchIntervalMs);
    return CATCH_COLORS[(target.phase + Math.max(0, step)) % CATCH_COLORS.length];
  }

  pressCatch(player, position, now = Date.now()) {
    const target = this.catchTargets[player];
    if (!target) return { accepted: false };
    const color = this.catchColorAt(player, now);
    const own = player === 0 ? 'blue' : 'orange';
    const opponent = player === 0 ? 'orange' : 'blue';
    const onTarget = position === target.position;
    let outcome = 'miss';
    if (onTarget && color === own) {
      outcome = 'hit';
      if (this.catchVariant === 'fill') {
        this.catchFilled[player].add(position);
        if (this.catchFilled[player].size === FIELD_SIZE) {
          this.scores[player]++;
          this.catchFilled = [new Set(), new Set()];
          outcome = 'field';
          this.nextCatch(1 - player, now);
        }
      } else this.scores[player]++;
    } else if (this.catchDifficulty === 'veryHard' && onTarget && color === opponent) {
      outcome = 'opponent';
      const other = 1 - player;
      if (this.catchVariant === 'fill') {
        if (!this.catchFilled[other].has(position)) this.catchFilled[other].add(position);
      } else this.scores[other]++;
    }
    this.nextCatch(player, now);
    return { accepted: true, outcome, color, scores: [...this.scores], filled: this.catchFilled.map(x => [...x]) };
  }

  intersectionSpeeds(difficulty) {
    return ({ easy: [1500, 3000], medium: [1000, 2000], hard: [1000, 1500] })[difficulty] || [1500, 3000];
  }

  randomTravelMs(difficulty) {
    const [min, max] = this.intersectionSpeeds(difficulty);
    return min + this.random() * (max - min);
  }

  startIntersection(difficulty = 'easy', now = Date.now()) {
    this.reset();
    this.mode = 'intersection';
    this.intersectionDifficulty = difficulty;
    this.intersection = [0, 1].map(() => ({
      holdUntil: 0,
      heldPosition: -1,
      cooldownUntil: 0,
      dots: [
        { position: 0, direction: 1, travelMs: this.randomTravelMs(difficulty), lastAt: now },
        { position: FIELD_SIZE - 1, direction: -1, travelMs: this.randomTravelMs(difficulty), lastAt: now }
      ]
    }));
  }

  updateIntersection(now = Date.now()) {
    for (const player of this.intersection) {
      if (!player) continue;
      if (player.holdUntil > now) {
        player.dots[0].position = player.heldPosition;
        player.dots[1].position = player.heldPosition;
        player.dots[0].lastAt = player.dots[1].lastAt = now;
        continue;
      }
      if (player.holdUntil) {
        player.holdUntil = 0;
        player.cooldownUntil = now + 180;
        player.dots[0].direction = -1;
        player.dots[1].direction = 1;
        player.dots[0].position = Math.max(0, player.heldPosition - .55);
        player.dots[1].position = Math.min(FIELD_SIZE - 1, player.heldPosition + .55);
      }
      for (const dot of player.dots) {
        const distance = (now - dot.lastAt) * (FIELD_SIZE - 1) / dot.travelMs;
        dot.position += dot.direction * distance;
        dot.lastAt = now;
        while (dot.position < 0 || dot.position > FIELD_SIZE - 1) {
          if (dot.position > FIELD_SIZE - 1) dot.position = 2 * (FIELD_SIZE - 1) - dot.position;
          else dot.position = -dot.position;
          dot.direction *= -1;
          dot.travelMs = this.randomTravelMs(this.intersectionDifficulty);
        }
      }
      const [first, second] = player.dots;
      if (first.direction === second.direction && Math.abs(first.position - second.position) < 2.5) {
        second.direction *= -1;
        second.travelMs = this.randomTravelMs(this.intersectionDifficulty);
      }
      if (now >= player.cooldownUntil && Math.round(first.position) === Math.round(second.position)) {
        player.heldPosition = Math.round((first.position + second.position) / 2);
        first.position = second.position = player.heldPosition;
        first.lastAt = second.lastAt = now;
        player.holdUntil = now + 500;
      }
    }
    return this.intersection.map(x => x.dots.map(d => d.position));
  }

  pressIntersection(player, position, now = Date.now()) {
    this.updateIntersection(now);
    const field = this.intersection[player];
    const dots = field?.dots;
    if (!dots || position < 1 || position > FIELD_SIZE) return { accepted: false };
    const center = field.heldPosition + 1;
    const hit = field.holdUntil > now && position === center;
    if (hit) this.scores[player]++;
    return { accepted: true, hit, position: Math.max(1, Math.min(15, Math.round(center))), scores: [...this.scores] };
  }

  pongTravelMs(difficulty) {
    return ({ easy: 3000, medium: 2000, hard: 1500, veryHard: 1500 })[difficulty] || 3000;
  }

  globalPaddle(player, position) {
    return player === 0 ? position - 1 : 30 - position;
  }

  safePaddle(player, entryGlobal) {
    const entries = Array.isArray(entryGlobal) ? entryGlobal : [entryGlobal];
    const allowed = Array.from({ length: FIELD_SIZE }, (_, i) => i + 1)
      .filter(position => entries.every(entry => Math.abs(this.globalPaddle(player, position) - entry) >= 5));
    return allowed[Math.floor(this.random() * allowed.length)] || 8;
  }

  receiverEntry(player) {
    return this.pongDifficulty === 'veryHard' ? (player === 0 ? [0, 14] : [15, 29]) : (player === 0 ? 14 : 15);
  }

  newServe(server = Math.floor(this.random() * 2), now = Date.now()) {
    const paddle = [this.randomPosition(), this.randomPosition()];
    this.pong = {
      server, receiver: 1 - server, paddle, serving: true, ball: server === 0 ? paddle[0] - 1 : 30 - paddle[1],
      direction: 0, lastAt: now, travelMs: this.pongTravelMs(this.pongDifficulty), windowAt: 0, attack: false
    };
    return this.pong;
  }

  startPong(difficulty = 'easy', now = Date.now()) {
    this.reset();
    this.mode = 'pong';
    this.pongDifficulty = difficulty;
    return this.newServe(Math.floor(this.random() * 2), now);
  }

  pressPong(player, position, now = Date.now()) {
    const p = this.pong;
    if (!p) return { accepted: false };
    if (p.serving) {
      if (player !== p.server || position !== p.paddle[player]) return { accepted: false };
      const global = player === 0 ? position - 1 : 30 - position;
      p.ball = global;
      if (position <= 4) p.direction = player === 0 ? 1 : -1;
      else if (position >= 12) p.direction = player === 0 ? -1 : 1;
      else p.direction = this.random() < .5 ? -1 : 1;
      if (player === 0 && p.direction < 0) p.direction = 1;
      if (player === 1 && p.direction > 0) p.direction = -1;
      p.serving = false; p.receiver = 1 - player;
      p.paddle[p.receiver] = this.safePaddle(p.receiver, this.receiverEntry(p.receiver));
      p.lastAt = now;
      return { accepted: true, serve: true, pong: p };
    }
    if (player !== p.receiver || position !== p.paddle[player]) return this.pongPoint(1 - player, player, position, now);
    const globalPaddle = player === 0 ? position - 1 : 30 - position;
    const distanceLeds = Math.abs(p.ball - globalPaddle);
    const distanceMs = distanceLeds * p.travelMs / 30;
    // A hit is spatial, not a wide time window: the ball must actually be on
    // the paddle LED (one rendered LED of tolerance for the 35 ms update step).
    if (distanceLeds > 1.05) return this.pongPoint(1 - player, player, position, now);
    const attack = distanceMs <= 50;
    p.direction *= -1; p.server = player; p.receiver = 1 - player;
    p.paddle[p.receiver] = this.safePaddle(p.receiver, this.receiverEntry(p.receiver));
    p.randomizedEntry = false;
    if (attack) p.travelMs = Math.max(500, p.travelMs / 1.5);
    p.lastAt = now;
    return { accepted: true, hit: true, attack, pong: p };
  }

  pongPoint(winner, loser, position, now = Date.now()) {
    this.scores[winner]++;
    const result = { accepted: true, point: true, winner, loser, position, scores: [...this.scores] };
    this.newServe(winner, now);
    return result;
  }

  updatePong(now = Date.now()) {
    const p = this.pong;
    if (!p || p.serving) return { point: false, pong: p };
    p.ball += p.direction * (now - p.lastAt) * 30 / p.travelMs;
    p.lastAt = now;
    if (this.pongDifficulty === 'veryHard') {
      if (!p.randomizedEntry) {
        // The ball first leaves the hitter's 15-LED field through either edge,
        // then appears at a random edge of the receiver's field.
        const leftServerField = p.server === 0 ? (p.ball < 0 || p.ball >= 15) : (p.ball < 15 || p.ball > 29);
        if (leftServerField) {
          p.ball = p.receiver === 0 ? (this.random() < .5 ? 0 : 14) : (this.random() < .5 ? 15 : 29);
          p.direction = p.receiver === 0 ? (p.ball === 0 ? 1 : -1) : (p.ball === 15 ? 1 : -1);
          p.randomizedEntry = true;
        }
      } else {
        const missedReceiverField = p.receiver === 0 ? (p.ball < 0 || p.ball >= 15) : (p.ball < 15 || p.ball > 29);
        if (missedReceiverField) return this.pongPoint(1 - p.receiver, p.receiver, p.paddle[p.receiver], now);
      }
    } else if (p.ball < 0 || p.ball > 29) {
      const loser = p.ball < 0 ? 0 : 1;
      return this.pongPoint(1 - loser, loser, p.paddle[loser], now);
    }
    return { point: false, pong: p };
  }
}

if (typeof module !== 'undefined') module.exports = { AdvancedGameEngine, FIELD_SIZE, CATCH_COLORS };
