import { ArchipelagoClient } from "./arhipelago/client.js";
import { Camera } from "./camera.ts";
import { Canvas, Flip } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { CollisionObject } from "./gameobject.ts";
import { clamp } from "./math.ts";
import { SpawnProjectileCallback } from "./objectmanager.ts";
import { Player } from "./player";
import { ProgressManager } from "./progress.ts";
import { Projectile } from "./projectile.ts";
import { Sprite } from "./sprite.ts";
import { Vector2 } from "./vector.ts";


const DEATH_TIME = 30;


enum DeathMode {

    Normal = 0,
    Spun = 1
};


export class Enemy extends CollisionObject {

    protected startPos: Vector2;

    private deathTimer: number;
    private deathMode: DeathMode;
    private starSprite: Sprite;
    private deathPos: Vector2;

    protected canJump: boolean;
    protected oldCanJump: boolean;

    protected canBeKnockedDown: boolean;
    protected knockDownYOffset: number;
    private knockDownTimer: number;
    private previousShakeState: boolean;

    protected flip: Flip;
    protected dir: number;

    protected canBeStomped: boolean;
    protected canBeSpun: boolean;
    protected knockOnStomp: boolean;
    protected killOnStomp: boolean;
    protected dieOnProjectile: boolean;

    protected ghost: boolean;

    protected projectileCb: SpawnProjectileCallback;

    private forceReset: boolean;
    private oldCameraState: boolean;

    // Good variable naming here
    protected id: number;
    public readonly entityID: number;

    private readonly hasBaseGravity: boolean;


    static BASE_GRAVITY = 2.0;


    constructor(x: number, y: number, id: number, entityID: number, baseGravity = false) {

        super(x, y, true);

        this.hasBaseGravity = baseGravity;

        this.startPos = this.pos.clone();

        this.id = id;
        this.entityID = entityID;

        this.spr = new Sprite(16, 16);
        this.spr.setFrame(0, this.id + 2);

        this.starSprite = new Sprite(16, 16);

        this.hitbox = new Vector2(8, 8);
        this.collisionBox = new Vector2(8, 8);

        this.flip = Flip.None;

        this.canBeKnockedDown = true;
        this.knockDownTimer = 0;

        this.friction = new Vector2(0.1, 0.15);
        if (baseGravity) {

            this.target.y = Enemy.BASE_GRAVITY;
        }

        this.canJump = false;
        this.oldCanJump = this.canJump;

        this.knockDownYOffset = 0;
        this.previousShakeState = false;

        this.canBeStomped = true;
        this.canBeSpun = true;
        this.knockOnStomp = false;
        this.killOnStomp = true;
        this.dieOnProjectile = true;

        this.deathTimer = 0;
        this.deathMode = DeathMode.Normal;
        this.deathPos = this.pos.clone();

        this.dir = -1 + 2 * (Math.floor(x / 16) % 2);

        this.ghost = false;

        this.oldCameraState = false;


    }


    public setProjectileCallback(cb: SpawnProjectileCallback) {

        this.projectileCb = cb;
    }


    protected outsideCameraEvent() {

        if (this.dying) {

            if (this.deathMode == DeathMode.Spun &&
                this.deathTimer > 0) {

                this.inCamera = true;
            }
            else {

                this.exist = false;
            }
            return;
        }

        if (!this.inCamera && this.oldCameraState) {

            this.forceReset = true;
        }
    }


    protected die(event: CoreEvent): boolean {

        const ANIM_SPEED = 3;
        const PUFF_SPEED = 4;
        const DEATH_GRAVITY = 4.0;

        this.flip = Flip.None;

        if (this.deathMode == DeathMode.Normal) {

            if (this.spr.getColumn() < 4)
                this.spr.animate(0, 0, 4, PUFF_SPEED, event.step);
        }
        else {

            this.target.y = DEATH_GRAVITY;
            this.updateMovement(event);
        }

        this.starSprite.animate(1, 0, 3, ANIM_SPEED, event.step);
        this.deathTimer -= event.step;

        return this.deathMode == DeathMode.Normal &&
            this.deathTimer <= 0;
    }


    protected updateAI(event: CoreEvent) { }


    private knockDown(jump = true) {

        const KNOCKDOWN_TIME = 150;
        const KNOCKDOWN_JUMP = -2.5;

        this.target.x = 0;
        this.speed.x = 0;

        this.knockDownTimer = KNOCKDOWN_TIME;
        if (jump) {

            this.speed.y = KNOCKDOWN_JUMP * (this.friction.y / 0.15);
        }

        this.spr.setFrame(0, this.spr.getRow());
    }


    protected preMovementEvent(event: CoreEvent) {

        this.oldCameraState = this.inCamera;

        if (this.canJump && event.isShaking() &&
            (this.knockDownTimer <= 0 || !this.previousShakeState)) {

            if (this.canBeKnockedDown) {

                this.knockDown(true);
            }
        }

        if (this.knockDownTimer > 0) {

            this.knockDownTimer -= event.step;
            return;
        }

        this.updateAI(event);

        this.previousShakeState = event.isShaking();
    }


    protected postMovementEvent(event: CoreEvent) {

        this.oldCanJump = this.canJump;
        this.canJump = false;
    }


    private drawDeath(canvas: Canvas) {

        const COUNT = [6, 4];
        const OFFSET = [(Math.PI / 2) / 3, Math.PI / 4];
        const DISTANCE = 32.0;

        if (this.deathTimer <= 0) return;

        let count = COUNT[this.deathMode];
        let offset = OFFSET[this.deathMode];

        let bmp = canvas.assets.getBitmap("enemies");

        let t = 1.0 - this.deathTimer / DEATH_TIME;
        let angle: number;

        let x: number;
        let y: number;

        let px = Math.round(this.deathPos.x);
        let py = Math.round(this.deathPos.y);

        for (let i = 0; i < count; ++i) {

            angle = offset + i * (Math.PI * 2 / count);

            x = px + (Math.cos(angle) * t * DISTANCE);
            y = py + (Math.sin(angle) * t * DISTANCE);

            canvas.drawSprite(this.starSprite, bmp,
                Math.round(x) - this.spr.width / 2,
                Math.round(y) - this.spr.height / 2,
                this.flip);
        }
    }


    protected preDraw(canvas: Canvas) { }


    public draw(canvas: Canvas) {

        const GHOST_ALPHA = 0.75;

        if (!this.exist || !this.inCamera)
            return;

        if (this.dying) {

            this.drawDeath(canvas);

            if (this.spr.getColumn() == 4)
                return;
        }

        if (this.ghost) {

            canvas.setGlobalAlpha(GHOST_ALPHA);
        }

        this.preDraw(canvas);

        let px = Math.round(this.pos.x) - this.spr.width / 2;
        let py = Math.round(this.pos.y) - this.spr.height / 2;

        let flip = this.flip;
        if (this.knockDownTimer > 0 ||
            (this.dying && this.deathMode == DeathMode.Spun)) {

            flip |= Flip.Vertical;
            py += this.knockDownYOffset;
        }

        let bmp = canvas.assets.getBitmap(this.ghost ? "ghosts" : "enemies");

        canvas.drawSprite(this.spr, bmp, px, py, flip);

        if (this.ghost) {

            canvas.setGlobalAlpha();
        }
    }


    public cameraEvent(camera: Camera) {

        if (!this.inCamera && this.forceReset &&
            !camera.isMoving()) {

            this.reset();

            this.forceReset = false;
        }
    }


    protected playerEvent(player: Player, event: CoreEvent) { }


    protected killSelf(progress: ProgressManager, event: CoreEvent,
        deathMode = DeathMode.Normal) {

        this.dying = true;
        this.knockDownTimer = 0;
        this.deathTimer = DEATH_TIME;
        this.deathMode = deathMode;

        this.starSprite.setFrame((Math.random() * 4) | 0, 1);

        if (!this.ghost) {
            ArchipelagoClient.getInstance().client.send(this.entityID + 114);
            //progress.increaseNumberProperty("kills", 1);
            progress.addValueToArray("enemiesKilled", this.entityID, true);
        }

        this.deathPos = this.pos.clone();

        event.audio.playSample(event.assets.getSample("kill"), 0.40);
    }


    private spinKnockback(player: Player) {

        const SPUN_FLY_SPEED_X = 3.0;
        const SPUN_FLY_SPEED_Y = -3.0;

        this.target.x = (player.getPos().x < this.pos.x ? 1 : -1) * SPUN_FLY_SPEED_X;
        this.speed.x = this.target.x;
        this.speed.y = SPUN_FLY_SPEED_Y;
    }


    public playerCollision(player: Player, event: CoreEvent): boolean {

        const STOMP_MARGIN = 4;
        const STOMP_EXTRA_RANGE = 2;
        const SPEED_EPS = -0.25;
        const PLAYER_JUMP = -3.0;

        if (!this.exist || !this.inCamera || this.dying)
            return false;

        let y = this.pos.y + this.center.y - this.hitbox.y - STOMP_MARGIN / 4;
        let h = STOMP_MARGIN + Math.abs(this.speed.y);

        let hbox = player.getHitbox();

        let py = player.getPos().y + hbox.y / 2;
        let px = player.getPos().x - hbox.x / 2;

        if ((this.canBeSpun || this.knockDownTimer > 0) &&
            player.checkSpinOverlay(this)) {

            this.spinKnockback(player);
            this.killSelf(player.progress, event, DeathMode.Spun);

            return true;
        }

        if ((this.canBeStomped || this.knockDownTimer > 0) &&
            (!player.isSwimming() || player.isSpinning()) &&
            player.getSpeed().y > SPEED_EPS &&
            px + hbox.x >= this.pos.x - this.hitbox.x / 2 - STOMP_EXTRA_RANGE &&
            px <= this.pos.x + this.hitbox.x / 2 + STOMP_EXTRA_RANGE &&
            py >= y && py <= y + h) {

            if (!player.isSpinning()) {

                player.makeJump(PLAYER_JUMP);

                if ((!this.killOnStomp || this.knockOnStomp) &&
                    !player.isDownAttacking()) {

                    event.audio.playSample(event.assets.getSample("hop"), 0.55);
                }
            }
            else if (this.canBeSpun || this.knockDownTimer > 0) {

                this.spinKnockback(player);
                this.killSelf(player.progress, event, DeathMode.Spun);

                return true;
            }

            if (this.knockOnStomp && !player.isDownAttacking() && !player.isSpinning()) {

                this.knockDown(false);
                // event.audio.playSample(event.assets.getSample("hop"), 0.55);
            }
            else if (this.killOnStomp || player.isDownAttacking()) {

                this.killSelf(player.progress, event);
            }
            return true;
        }

        if (this.knockDownTimer <= 0)
            this.playerEvent(player, event);

        return player.hurtCollision(
            this.pos.x - this.hitbox.x / 2,
            this.pos.y - this.hitbox.y / 2,
            this.hitbox.x, this.hitbox.y,
            Math.sign(player.getPos().x - this.pos.x), event);
    }


    public projectileCollision(p: Projectile, player: Player, event: CoreEvent): boolean {

        if (!p.isFriendly() ||
            !this.exist || !this.inCamera || this.dying ||
            !p.doesExist() || p.isDying())
            return false;

        if (this.overlayObject(p)) {

            p.destroy(event);

            if (this.dieOnProjectile)
                this.killSelf(player.progress, event);

            return true;
        }

        return false;
    }


    protected verticalCollisionEvent(dir: number, event: CoreEvent) {

        if (dir == 1) {

            this.canJump = true;
        }
    }


    public makeGhost() {

        this.ghost = true;
    }


    public isGhost = (): boolean => this.ghost;


    protected respawnEvent() { }


    private reset() {

        if (!this.exist || this.dying) return;

        this.canJump = false;
        this.oldCanJump = false;

        this.stopMovement();

        this.spr.setFrame(0, this.id + 2);

        this.pos = this.startPos.clone();

        this.flip = Flip.None;

        this.deathTimer = 0;
        // this.dir = -1 + 2 * (Math.floor(this.startPos.x / 16) % 2); 

        this.respawnEvent();

        if (this.hasBaseGravity) {

            this.target.y = Enemy.BASE_GRAVITY;
        }

        this.knockDownTimer = 0;
    }


    public respawn() {

        this.ghost = this.ghost || (!this.exist || this.dying);

        this.dying = false;
        this.exist = true;

        this.reset();
    }
}


//
// Enemy types
//


export class Slime extends Enemy {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 0, entityID, true);

        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(8, 8);

        this.knockDownYOffset = 5;

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.spr.setFrame((Math.random() * 4) | 0, this.spr.getRow());
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 8;

        this.spr.animate(this.spr.getRow(),
            0, 3, ANIM_SPEED, event.step);
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        this.flip = player.getPos().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }

}


export class SpikeSlime extends Enemy {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 1, entityID, true);

        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(8, 10);

        this.knockDownYOffset = 5;

        this.canBeStomped = false;
        this.canBeSpun = false;
    }


    protected updateAI(event: CoreEvent) {

        const WAIT_TIME = 60;
        const ANIM_SPEED = 12;

        this.spr.animate(this.spr.getRow(),
            0, 3,
            this.spr.getColumn() == 0 ? WAIT_TIME : ANIM_SPEED,
            event.step);
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        this.flip = player.getPos().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }

}


export class Turtle extends Enemy {


    protected baseSpeed: number;
    protected animSpeed: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y + 1, 2, entityID, true);

        this.spr.setFrame(0, this.spr.getRow());

        this.knockOnStomp = true;

        this.collisionBox.x = 4;
        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(10, 8);

        this.knockDownYOffset = 4;

        this.baseSpeed = 0;
        this.animSpeed = 6;

        this.respawnEvent();
    }


    protected respawnEvent() {

        const SPEED = 0.20;

        this.baseSpeed = this.dir * SPEED;

        this.dir = -1 + 2 * (Math.floor(this.startPos.x / 16) % 2);
    }


    protected updateAI(event: CoreEvent) {

        this.spr.animate(this.spr.getRow(),
            0, 3, this.animSpeed, event.step);

        if (this.oldCanJump && !this.canJump) {

            this.pos.x -= this.speed.x * event.step;

            this.baseSpeed *= -1;
        }

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;

        this.flip = this.baseSpeed > 0 ? Flip.Horizontal : Flip.None;
    }


    protected wallCollisionEvent(dir: number, event: CoreEvent) {

        this.dir = -dir;
        this.baseSpeed = Math.abs(this.baseSpeed) * this.dir;

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;
    }

}


export class Seal extends Enemy {


    private jumpTimer: number;
    protected jumpInterval: number;
    protected jumpHeight: number;
    protected moveSpeed: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y + 1, 3, entityID, true);

        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(8, 8);

        this.knockDownYOffset = 5;

        this.jumpTimer = 0;
        this.jumpInterval = 30;
        this.jumpHeight = -1.75;
        this.moveSpeed = 0.5;

        this.respawnEvent();

        this.friction.y = 0.1;
    }


    protected respawnEvent() {

        let x = this.startPos.x;

        this.jumpTimer = this.jumpInterval + (((x / 16) | 0) % 2) * this.jumpInterval / 2;

        this.dir = -1 + 2 * (Math.floor(this.startPos.x / 16) % 2);
    }


    protected updateAI(event: CoreEvent) {

        const EPS = 0.5;

        let frame = 0;

        if (this.canJump) {

            this.spr.setFrame(0, this.spr.getRow());

            this.target.x = 0;
            if ((this.jumpTimer -= event.step) <= 0) {

                this.speed.y = this.jumpHeight;
                this.jumpTimer = this.jumpInterval;

                this.speed.x = this.dir * this.moveSpeed;
                this.target.x = this.speed.x;

                event.audio.playSample(event.assets.getSample("enemyJump"), 0.50);
            }
        }
        else {

            if (this.speed.y < -EPS)
                frame = 1;
            else if (this.speed.y > EPS)
                frame = 2;

            this.spr.setFrame(frame, this.spr.getRow());

            this.flip = this.speed.x < 0 ? Flip.None : Flip.Horizontal;
        }
    }


    protected wallCollisionEvent(dir: number, event: CoreEvent) {

        if (this.canJump) return;

        this.dir = -dir;
        this.speed.x = this.dir * this.moveSpeed;
        this.target.x = this.speed.x;
    }

}


export class SpikeTurtle extends Turtle {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, entityID);

        this.canBeStomped = false;
        this.canBeSpun = false;

        this.id = 4;
        this.spr.setFrame(0, this.id + 2);

        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(10, 10);

        this.animSpeed = 5;
    }


    protected respawnEvent() {

        const SPEED = 0.30;

        this.baseSpeed = this.dir * SPEED;

        this.dir = -1 + 2 * (Math.floor(this.startPos.x / 16) % 2);
    }
}


class WaveObject extends Enemy {


    protected wave: Vector2;
    protected waveSpeed: Vector2;
    protected amplitude: Vector2;


    constructor(x: number, y: number, id: number, entityID: number) {

        super(x, y, id, entityID, false);

        this.canBeKnockedDown = false;

        this.wave = new Vector2();
        this.waveSpeed = new Vector2(0.0, 0.0);
        this.amplitude = new Vector2(0, 0);
    }


    protected updateWave(event: CoreEvent) {

        this.wave.x += this.waveSpeed.x * event.step;
        this.wave.x %= Math.PI * 2;

        this.wave.y += this.waveSpeed.y * event.step;
        this.wave.y %= Math.PI * 2;

        this.pos.x = this.startPos.x + Math.sin(this.wave.x) * this.amplitude.x;
        this.pos.y = this.startPos.y + Math.sin(this.wave.y) * this.amplitude.y;
    }

}


export class Apple extends WaveObject {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 5, entityID);

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(8, 8);

        this.waveSpeed = new Vector2(0.05, 0.025);
        this.amplitude = new Vector2(4, 16);

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.wave.zeros();

        this.spr.setFrame((Math.random() * 4) | 0, this.spr.getRow());
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 6;

        this.updateWave(event);

        this.spr.animate(this.spr.getRow(),
            0, 3, ANIM_SPEED, event.step);
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        this.flip = player.getPos().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }

}


export class Imp extends WaveObject {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 6, entityID);

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(10, 8);

        this.waveSpeed = new Vector2(0.025, 0.05);
        this.amplitude = new Vector2(16, 4);

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.wave.zeros();

        this.spr.setFrame((Math.random() * 4) | 0, this.spr.getRow());
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 6;

        this.updateWave(event);

        this.spr.animate(this.spr.getRow(),
            0, 3, ANIM_SPEED, event.step);
    }

}


export class Mushroom extends Enemy {


    static JUMP_TIME = 60;


    private jumpTimer: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y + 1, 7, entityID, true);

        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(8, 8);

        this.knockDownYOffset = 1;

        this.friction.y = 0.1;

        this.jumpTimer = 0;

        this.respawnEvent();
    }


    protected respawnEvent() {

        let x = this.startPos.x;
        this.jumpTimer = Mushroom.JUMP_TIME + (((x / 16) | 0) % 2) * Mushroom.JUMP_TIME / 2;
    }


    protected updateAI(event: CoreEvent) {

        const EPS = 0.5;
        const JUMP_HEIGHT = -2.5;

        let frame = 0;

        if (this.canJump) {

            this.spr.setFrame(0, this.spr.getRow());

            if ((this.jumpTimer -= event.step) <= 0) {

                this.speed.y = JUMP_HEIGHT;
                this.jumpTimer = Mushroom.JUMP_TIME;

                event.audio.playSample(event.assets.getSample("enemyJump"), 0.50);
            }
        }
        else {

            if (this.speed.y < -EPS)
                frame = 1;
            else if (this.speed.y > EPS)
                frame = 2;

            this.spr.setFrame(frame, this.spr.getRow());
        }
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        if (!this.canJump) return;

        this.flip = player.getPos().x < this.pos.x ? Flip.None : Flip.Horizontal;
    }

}


export class FakeBlock extends Enemy {


    private phase: number;
    private shakeTimer: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y - 1, 8, entityID, false);

        this.center = new Vector2(0, -1);
        this.collisionBox.y = 16;
        this.hitbox = new Vector2(10, 10);

        this.canBeKnockedDown = false;
        this.killOnStomp = false;
        this.dieOnProjectile = false;

        this.phase = 0;
        this.shakeTimer = 0;

        this.friction.y = 0.25;

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.phase = 0;
        this.shakeTimer = 0;

        this.spr.setFrame(0, this.spr.getRow());
    }


    protected updateAI(event: CoreEvent) {

        const RETURN_SPEED = -1.0;
        const EPS = 2.0;

        if (this.phase == 2) {

            if ((this.shakeTimer -= event.step) <= 0) {

                this.phase = 3;
                this.speed.y = RETURN_SPEED;
                this.target.y = RETURN_SPEED;

                this.spr.setFrame(2, this.spr.getRow());
            }
        }
        else if (this.phase == 3) {

            if (this.pos.y <= this.startPos.y + EPS) {

                this.pos.y = this.startPos.y;
                this.stopMovement();

                this.phase = 0;

                this.spr.setFrame(0, this.spr.getRow());
            }
        }
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        const MARGIN = 32;
        const GRAVITY = 8.0;

        let p = player.getPos();

        if (this.phase > 0 ||
            p.y < this.pos.y ||
            Math.abs(p.x - this.pos.x) > MARGIN) return;

        this.phase = 1;
        this.target.y = GRAVITY;

        this.spr.setFrame(1, this.spr.getRow());
    }


    protected verticalCollisionEvent(dir: number, event: CoreEvent) {

        const SHAKE_TIME = 60;
        const MAGNITUDE = 1;

        if (dir != 1 || this.phase != 1)
            return;

        this.phase = 2;
        this.shakeTimer = SHAKE_TIME;

        event.shake(SHAKE_TIME, MAGNITUDE);

        event.audio.playSample(event.assets.getSample("shake"), 0.50);
    }
}


export class Spinner extends Enemy {


    static RADIUS = 24;


    private angle: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 9, entityID, true);

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(8, 8);

        this.canBeKnockedDown = false;
        this.canBeSpun = false;
        this.canBeStomped = false;

        this.angle = 0;

        this.offCameraRadius = Spinner.RADIUS * 2;

        this.disableCollisions = true;

        this.respawnEvent();
    }


    private computePosition() {

        this.pos.x = this.startPos.x + Math.round(Math.cos(this.angle) * Spinner.RADIUS * this.dir);
        this.pos.y = this.startPos.y + Math.round(Math.sin(this.angle) * Spinner.RADIUS);
    }


    protected respawnEvent() {

        this.angle = (this.startPos.y % 360) / 360.0 * (Math.PI * 2);
        this.dir = ((this.startPos.x / 16) | 0) % 2 == 0 ? 1 : -1;

        this.computePosition();
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 8;
        const ROTATION_SPEED = 0.05;

        this.angle = (this.angle + ROTATION_SPEED * event.step) % (Math.PI * 2);
        this.computePosition();

        let startFrame = this.dir < 0 ? 0 : 2;
        this.spr.animate(this.spr.getRow(),
            startFrame, startFrame + 1,
            ANIM_SPEED, event.step);
    }


    protected preDraw(canvas: Canvas) {

        const CHAIN_PIECE_COUNT = 3;

        let radiusStep = Spinner.RADIUS / (CHAIN_PIECE_COUNT);

        let bmp = canvas.assets.getBitmap("enemies");

        let r = 0;
        let x: number;
        let y: number;
        for (let i = 0; i < CHAIN_PIECE_COUNT; ++i) {

            x = this.startPos.x + Math.round(Math.cos(this.angle) * this.dir * r);
            y = this.startPos.y + Math.round(Math.sin(this.angle) * r);

            canvas.drawSpriteFrame(this.spr, bmp,
                4, this.spr.getRow(),
                x - 8, y - 8);

            r += radiusStep;
        }
    }
}


export class Fish extends Enemy {


    private baseSpeed: number;
    private wave: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y + 1, 10, entityID, false);

        this.spr.setFrame(0, this.spr.getRow());

        this.canBeKnockedDown = false;

        this.collisionBox.y = 2;

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(10, 8);

        this.baseSpeed = 0;
        this.wave = 0;

        this.friction.y = 0.05;

        this.respawnEvent();
    }


    protected respawnEvent() {

        const SPEED = 0.20;

        this.baseSpeed = this.dir * SPEED;
        this.wave = 0;

        this.dir = -1 + 2 * (Math.floor(this.startPos.x / 16) % 2);
    }


    protected updateAI(event: CoreEvent) {

        const WAVE_SPEED = 0.10;
        const BASE_TARGET_Y = 0.25;
        const EPS = 0.075;

        if (this.oldCanJump && !this.canJump) {

            this.pos.x -= this.speed.x * event.step;

            this.baseSpeed *= -1;
        }

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;

        this.wave = (this.wave + WAVE_SPEED * event.step) % (Math.PI * 2);
        this.target.y = Math.sin(this.wave) * BASE_TARGET_Y;

        let frame = 0;
        if (this.speed.y < -EPS)
            frame = 2;
        else if (this.speed.y > EPS)
            frame = 1;

        this.spr.setFrame(frame, this.spr.getRow());

        this.flip = this.baseSpeed > 0 ? Flip.Horizontal : Flip.None;
    }


    protected wallCollisionEvent(dir: number, event: CoreEvent) {

        this.dir = -dir;
        this.baseSpeed = Math.abs(this.baseSpeed) * this.dir;

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;
    }

}


export class Eye extends Enemy {


    static WAIT_TIME = 60;


    private waitTime: number;
    private animationPhase: number;

    private direction: Vector2;


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 11, entityID, false);

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(10, 10);

        this.canBeKnockedDown = false;

        this.waitTime = 0;
        this.animationPhase = 0;

        this.direction = new Vector2();

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.waitTime = Eye.WAIT_TIME;
        this.animationPhase = 0;

        this.spr.setFrame(0, this.spr.getRow());
    }


    private shootBullet(event: CoreEvent) {

        const SPEED = 1.5;

        let speed = Vector2.scalarMultiply(this.direction, SPEED);

        this.projectileCb(this.pos.x, this.pos.y,
            speed.x, speed.y, false, 1, false);

        event.audio.playSample(event.assets.getSample("shoot"), 0.40);
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 8;
        const OPEN_TIME = 30;

        if (this.animationPhase == 0) {

            if ((this.waitTime -= event.step) <= 0) {

                this.shootBullet(event);

                this.animationPhase = 1;
            }
        }
        else if (this.animationPhase == 1) {

            this.spr.animate(this.spr.getRow(),
                1, 4, this.spr.getColumn() == 3 ? OPEN_TIME : ANIM_SPEED,
                event.step);
            if (this.spr.getColumn() == 4) {

                this.animationPhase = 2;
                this.spr.setFrame(3, this.spr.getRow());
            }
        }
        else if (this.animationPhase == 2) {

            this.spr.animate(this.spr.getRow(), 3, 0,
                ANIM_SPEED, event.step);
            if (this.spr.getColumn() == 0) {

                this.animationPhase = 0;
                this.waitTime = Eye.WAIT_TIME;
            }
        }
    }


    protected playerEvent(player: Player, event: CoreEvent) {

        this.direction = Vector2.direction(this.pos, player.getPos());
    }
}


class FaceRight extends Enemy {


    static WAIT_TIME = 60;


    private waitTime: number;
    private mouthOpen: boolean;


    constructor(x: number, y: number, entityID: number) {

        super(x, y, 12, entityID, false);

        this.center = new Vector2(0, 0);
        this.hitbox = new Vector2(10, 8);

        this.canBeKnockedDown = false;

        this.waitTime = 0;
        this.mouthOpen = false;

        this.dir = 1;

        this.respawnEvent();
    }


    protected respawnEvent() {

        this.waitTime = FaceRight.WAIT_TIME;
        this.mouthOpen = false;

        this.spr.setFrame(0, this.spr.getRow());

        this.flip = this.dir < 0 ? Flip.Horizontal : Flip.None;
    }


    private shootBullet(event: CoreEvent) {

        const SPEED = 2.0;

        this.projectileCb(this.pos.x + this.dir * 4, this.pos.y + 2,
            SPEED * this.dir, 0, false, 1, false);

        event.audio.playSample(event.assets.getSample("shoot"), 0.40);
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 30;

        if (!this.mouthOpen) {

            if ((this.waitTime -= event.step) <= 0) {

                this.shootBullet(event);
                this.mouthOpen = true;

                this.spr.setFrame(1, this.spr.getRow());
            }
        }
        else {

            this.spr.animate(this.spr.getRow(), 1, 0, ANIM_SPEED, event.step);
            if (this.spr.getColumn() == 0) {

                this.mouthOpen = false;

                this.waitTime = FaceRight.WAIT_TIME;
            }
        }
    }
}


export class FaceLeft extends FaceRight {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, entityID);

        this.dir = -1;
        this.flip = Flip.Horizontal;
    }
}



export class SpikeSeal extends Seal {


    constructor(x: number, y: number, entityID: number) {

        super(x, y, entityID);

        this.id = 13;
        this.spr.setFrame(0, this.id + 2);

        this.knockDownYOffset = 4;

        this.jumpInterval = 20;
        this.jumpHeight = -2.0;
        this.moveSpeed = 0.50;

        this.canBeStomped = false;
        this.canBeSpun = false;

        this.respawnEvent();
    }
}


export class Plant extends Enemy {


    private baseSpeed: number;
    private shootTimer: number;
    private shootWait: number;


    constructor(x: number, y: number, entityID: number) {

        super(x, y + 1, 14, entityID, true);

        this.spr.setFrame(0, this.spr.getRow());

        this.collisionBox.x = 4;
        this.center = new Vector2(0, 3);
        this.hitbox = new Vector2(8, 10);

        this.knockDownYOffset = 4;

        this.baseSpeed = 0;

        this.shootTimer = 0;
        this.shootWait = 0;

        this.respawnEvent();
    }


    protected respawnEvent() {

        const SPEED = 0.25;

        this.shootTimer = 0;
        this.shootWait = 0;

        this.baseSpeed = this.dir * SPEED;
    }


    private shootBullet(event: CoreEvent) {

        const SPEED_Y = -2.5;
        const SPEED_X = 0.75;

        for (let i = -1; i <= 1; i += 2) {

            this.projectileCb(this.pos.x, this.pos.y - 2,
                SPEED_X * i, SPEED_Y, true, 1, false);
        }

        event.audio.playSample(event.assets.getSample("shoot"), 0.40);
    }


    protected updateAI(event: CoreEvent) {

        const ANIM_SPEED = 7;
        const SHOOT_TIME = 120;
        const SHOOT_WAIT = 30;

        if (this.shootWait > 0) {

            this.shootWait -= event.step;
            return;
        }

        if ((this.shootTimer += event.step) >= SHOOT_TIME) {

            this.shootTimer = 0;
            this.shootWait = SHOOT_WAIT;

            this.target.x = 0;
            this.speed.x = 0;

            this.spr.setFrame(4, this.spr.getRow());

            this.shootBullet(event);

            return;
        }

        this.spr.animate(this.spr.getRow(),
            0, 3, ANIM_SPEED, event.step);

        if (this.oldCanJump && !this.canJump) {

            this.pos.x -= this.speed.x * event.step;

            this.baseSpeed *= -1;
        }

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;
    }


    protected wallCollisionEvent(dir: number, event: CoreEvent) {

        this.dir = -dir;
        this.baseSpeed = Math.abs(this.baseSpeed) * this.dir;

        this.target.x = this.baseSpeed;
        this.speed.x = this.target.x;
    }

}


const ENEMY_TYPES = [
    Slime, SpikeSlime, Turtle,
    Seal, SpikeTurtle, Apple,
    Imp, Mushroom, FakeBlock,
    Spinner, Fish, Eye,
    FaceRight, FaceLeft, SpikeSeal,
    Plant];

export const getEnemyType = (index: number): Class => ENEMY_TYPES[clamp(index, 0, ENEMY_TYPES.length - 1)];
