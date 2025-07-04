import { Camera } from "./camera.ts";
import { Canvas, Flip } from "./canvas.ts";
import { CoreEvent } from "./core.ts";
import { Dust } from "./dust.ts";
import { boxOverlay, CollisionObject, nextObject, WeakGameObject } from "./gameobject.ts";
import { negMod } from "./math.ts";
import { SpawnProjectileCallback } from "./objectmanager.ts";
import { ProgressManager } from "./progress.ts";
import { Projectile } from "./projectile.ts";
import { SavePoint } from "./savepoint.ts";
import { Sprite } from "./sprite.ts";
import { Stage } from "./stage.ts";
import { State } from "./types.ts";
import { Vector2 } from "./vector.ts";


const BASE_JUMP_SPEED = 2.0;
const BASE_GRAVITY = 3.0;


export class Player extends CollisionObject {

    private sprSpin: Sprite;

    private startPos: Vector2;

    private jumpMargin: number;
    private jumpTimer: number;
    private canJump: boolean;
    private jumpSpeed: number;
    private doubleJump: boolean;
    private jumpReleased: boolean;

    private touchWater: boolean;

    private faceDir: number;
    private flip: Flip;

    private dust: Array<Dust>;
    private dustTimer: number;

    private running: boolean;

    private climbing: boolean;
    private touchLadder: boolean;
    private isLadderTop: boolean;
    private climbX: number;
    private climbFrame: number;

    private throwing: boolean;
    private canThrow: boolean;

    private sliding: boolean;
    private slideTimer: number;

    private downAttacking: boolean;
    private downAttackWaitTimer: number;

    private spinning: boolean;
    private spinCount: number;
    private canSpin: boolean;
    private spinHitbox: Vector2;

    private invulnerabilityTimer: number;
    private knockbackTimer: number;

    private flapping: boolean;

    private showActionSymbol: boolean;
    private actionSymbolId: number;
    private sprActionSymbol: Sprite;

    private holdingItem: boolean;
    private itemID: number;

    public inside: boolean;
    private startInside: boolean;
    private hasTeleported: boolean;

    private health: number;
    private deathTimer: number;

    private activeCheckpoint: SavePoint;

    private projectileCb: SpawnProjectileCallback;

    public readonly progress: ProgressManager;
    public readonly isInFinalArea: boolean;

    private static instance: Player;


    constructor(x: number, y: number, projectileCb: SpawnProjectileCallback,
        progress: ProgressManager, inside = false, isInFinalArea = false) {

        super(x, y + 1);

        this.sprSpin = new Sprite(32, 16);

        this.startPos = this.pos.clone();

        this.spr = new Sprite(16, 16);
        this.spr.setFrame(5, 1);

        this.hitbox = new Vector2(9, 11);
        this.center = new Vector2(0, 2);
        this.collisionBox = new Vector2(8, 12);

        this.friction = new Vector2(0.1, 0.15);
        this.offCameraRadius = 0;

        this.jumpTimer = 0;
        this.jumpMargin = 0;
        this.canJump = true;
        this.jumpSpeed = 0.0;
        this.doubleJump = false;
        this.jumpReleased = false;

        this.touchWater = false;

        this.faceDir = 1;
        this.flip = isInFinalArea ? Flip.Horizontal : Flip.None;

        this.inCamera = true;

        this.dust = new Array<Dust>();
        this.dustTimer = 0;

        this.climbX = 0;
        this.climbing = false;
        this.touchLadder = false;
        this.isLadderTop = false;

        this.throwing = false;
        this.canThrow = false;
        this.climbFrame = 0;

        this.sliding = false;
        this.slideTimer = 0;

        this.spinCount = 0;
        this.spinning = false;
        this.canSpin = false;
        this.spinHitbox = new Vector2(28, 6);

        this.downAttackWaitTimer = 0;
        this.downAttacking = false;

        this.invulnerabilityTimer = 0;
        this.knockbackTimer = 0;

        this.flapping = false;

        this.showActionSymbol = false;
        this.actionSymbolId = 0;
        this.sprActionSymbol = new Sprite(16, 16);

        this.holdingItem = false;
        this.itemID = 0;

        this.inside = inside;
        this.startInside = inside;
        this.hasTeleported = false;

        this.health = 3;
        this.deathTimer = 0;

        this.activeCheckpoint = null;

        this.projectileCb = projectileCb;

        this.progress = progress;

        this.isInFinalArea = isInFinalArea;
    }

    public static getInstance(): Player {
        if (!Player.instance) {
            Player.instance = new Player();
        }
        return Player.instance;
    }

    private startClimbing(event: CoreEvent) {

        if (!this.climbing &&
            this.touchLadder &&
            (!this.isLadderTop && event.input.upPress() ||
                (this.isLadderTop && event.input.downPress()))) {

            this.climbing = true;
            this.jumpTimer = 0;
            this.doubleJump = false;
            this.flapping = false;
            this.canSpin = true;
            this.spinning = false;

            this.pos.x = this.climbX;

            if (this.isLadderTop) {

                this.pos.y += 6;
            }
            this.stopMovement();
            this.jumpTimer = 0;
        }
    }


    private climb(event: CoreEvent) {

        const EPS = 0.1;
        const CLIMB_SPEED = 0.5;
        const CLIB_JUMP_TIME = 10;

        this.target.x = 0;

        let sx = event.input.getStick().x;
        if (Math.abs(sx) > EPS)
            this.faceDir = sx > 0 ? 1 : -1;

        this.flip = Flip.None;

        let s = event.input.getAction("fire1");

        if (!this.touchLadder) {

            this.climbing = false;
        }
        else {

            this.canThrow = true;

            this.target.y = CLIMB_SPEED * event.input.getStick().y;
            if (s == State.Pressed) {

                this.climbing = false;
                this.doubleJump = false;
                this.jumpReleased = false;

                if (event.input.getStick().y < EPS) {

                    this.jumpTimer = CLIB_JUMP_TIME;
                }

                if (Math.abs(sx) > EPS)
                    this.faceDir = sx > 0 ? 1 : -1;

                event.audio.playSample(event.assets.getSample("jump"), 0.50);
            }
        }
    }


    private throwRock(event: CoreEvent): boolean {

        const ROCK_SPEED_X = 3.0;
        const ROCK_JUMP = -1.0;

        if (!this.progress.doesValueExistInArray("items", 3))
            return false;

        if (this.throwing) return true;

        if (!this.sliding &&
            this.canThrow &&
            event.input.getAction("fire4") == State.Pressed) {

            this.throwing = true;
            this.canThrow = false;

            this.flip = this.faceDir > 0 ? Flip.None : Flip.Horizontal;

            if (this.climbing) {

                this.climbFrame = this.spr.getColumn();
            }

            this.spr.setFrame(0, 3);

            this.stopMovement();
            this.jumpTimer = 0;

            this.projectileCb(
                this.pos.x + this.faceDir * 6, this.pos.y - 2,
                this.faceDir * ROCK_SPEED_X, ROCK_JUMP, true, 0, true);

            event.audio.playSample(event.assets.getSample("throw"), 0.60);

            return true;
        }
        return false;
    }


    private computeCollisionBoxHeight() {

        const SLIDE_HITBOX_Y = 2.0;
        const BASE_HITBOX_Y = 10;

        this.collisionBox.y = this.sliding ? SLIDE_HITBOX_Y : BASE_HITBOX_Y;
        this.center.y = this.sliding ? 6 : 2;
    }


    private slide(event: CoreEvent) {

        const EPS = 0.25;
        const SLIDE_TIME = 20;
        const SLIDE_SPEED = 3.0;

        if (!this.progress.doesValueExistInArray("items", 4))
            return false;

        let s = event.input.getAction("fire3");

        if (this.sliding) {

            if ((this.slideTimer -= event.step) <= 0 ||
                (s & State.DownOrPressed) == 0) {

                this.sliding = false;
                return false;
            }
            return true;
        }

        if (!this.canJump) return false;

        if (s == State.Pressed) {

            this.slideTimer = SLIDE_TIME;
            this.target.x = 0;
            this.speed.x = SLIDE_SPEED * this.faceDir;

            this.dustTimer = 0;

            this.sliding = true;

            this.computeCollisionBoxHeight();

            event.audio.playSample(event.assets.getSample("jump"), 0.50);

            return true;
        }
        return false;
    }


    private waitDownAttack(event: CoreEvent): boolean {

        if (this.downAttackWaitTimer > 0) {

            this.downAttackWaitTimer -= event.step;

            return this.downAttackWaitTimer > 0;
        }

        return this.downAttacking;
    }


    private jump(event: CoreEvent) {

        const DOWN_EPS = 0.25;

        const JUMP_TIME = 12;
        const DOUBLE_JUMP_TIME = 30;
        const BASE_JUMP_MOD = 0.25;
        const DOWN_ATTACK_JUMP = -1.5;
        const DOWN_ATTACK_GRAVITY = 6.0;

        const FLAP_GRAVITY = 0.5;

        let s = event.input.getAction("fire1");

        if (this.progress.doesValueExistInArray("items", 1) &&
            !this.canJump &&
            !this.spinning &&
            event.input.getStick().y > DOWN_EPS &&
            s == State.Pressed) {

            this.downAttacking = true;
            this.downAttackWaitTimer = 0;

            this.stopMovement();

            this.speed.y = DOWN_ATTACK_JUMP;
            this.target.y = DOWN_ATTACK_GRAVITY;

            event.audio.playSample(event.assets.getSample("dive"), 0.55);

            return;
        }

        if (this.jumpTimer <= 0 &&
            (this.jumpMargin > 0 ||
                (!this.doubleJump && this.progress.doesValueExistInArray("items", 6))) &&
            s == State.Pressed) {

            if (this.jumpMargin > 0) {

                this.jumpSpeed = BASE_JUMP_SPEED + Math.abs(this.speed.x) * BASE_JUMP_MOD;
                this.jumpMargin = 0;

                this.jumpTimer = JUMP_TIME;

                event.audio.playSample(event.assets.getSample("jump"), 0.50);
            }
            else {

                this.jumpTimer = DOUBLE_JUMP_TIME;
                this.jumpSpeed = BASE_JUMP_SPEED;
                this.doubleJump = true;
            }
            this.canJump = false;
            this.jumpReleased = false;
        }
        else if (this.jumpTimer > 0 &&
            (s & State.DownOrPressed) == 0) {

            this.jumpTimer = 0;
        }

        if (!this.flapping &&
            !this.jumpReleased &&
            (s & State.DownOrPressed) == 0) {

            this.jumpReleased = true;
        }

        this.flapping = !this.touchWater &&
            !this.canJump &&
            !this.spinning &&
            this.progress.doesValueExistInArray("items", 5) &&
            this.jumpReleased &&
            this.jumpTimer <= 0 &&
            (!this.progress.doesValueExistInArray("items", 6) || this.doubleJump) &&
            (s & State.DownOrPressed) == 1;
        if (this.flapping) {

            // this.speed.y = FLAP_GRAVITY;
            this.target.y = FLAP_GRAVITY;
            if (this.speed.y > this.target.y)
                this.speed.y = this.target.y;
        }
    }


    private spin(event: CoreEvent): boolean {

        if (this.climbing || this.throwing || this.downAttacking ||
            this.downAttackWaitTimer > 0) return false;


        if (this.spinning)
            return true;

        let s = event.input.getAction("fire2");
        if (!this.spinning && this.canSpin &&
            s == State.Pressed) {

            this.spinning = true;
            this.spinCount = 0;
            this.canSpin = false;

            // this.jumpReleased = false;
            this.flapping = false;

            this.sprSpin.setFrame(0, 0);

            event.audio.playSample(event.assets.getSample("spin"), 0.50);

            return true;
        }

        return false;
    }


    private control(event: CoreEvent) {

        const BASE_FRICTION_Y = 0.15;
        const MOVE_SPEED = 0.75;
        const RUN_MOD = 1.66667;
        const EPS = 0.01;
        const DOWN_ATTACK_FRICTION = 0.30;
        const SWIM_SPEED_REDUCTION_X = 0.5;
        const SWIM_SPEED_REDUCTION_Y = 0.25;

        let stick = event.input.getStick();

        this.computeCollisionBoxHeight();
        this.friction.y = this.downAttacking ? DOWN_ATTACK_FRICTION : BASE_FRICTION_Y;

        if (!this.spin(event)) {

            if (this.waitDownAttack(event) ||
                this.throwRock(event) ||
                this.slide(event)) {

                return;
            }
        }

        this.startClimbing(event);
        if (this.climbing) {

            this.climb(event);
            return;
        }

        this.target.x = stick.x * MOVE_SPEED;
        this.target.y = BASE_GRAVITY;

        if (Math.abs(stick.x) > EPS) {

            this.flip = stick.x > 0 ? Flip.None : Flip.Horizontal;
            this.faceDir = stick.x > 0 ? 1 : -1;
        }

        this.jump(event);

        this.running = this.progress.doesValueExistInArray("items", 0) &&
            Math.abs(this.target.x) > EPS;
        if (this.running) {
            this.target.x *= RUN_MOD;
        }

        if (this.touchWater) {

            this.target.x *= SWIM_SPEED_REDUCTION_X;
            this.target.y *= SWIM_SPEED_REDUCTION_Y;
            this.friction.y *= SWIM_SPEED_REDUCTION_Y;

            if (this.speed.y > this.target.y + EPS) {

                this.speed.y = this.target.y;
            }
        }
    }


    private animate(event: CoreEvent) {

        const EPS = 0.01;
        const JUMP_EPS = 0.75;
        const RUN_SPEED_BASE = 10;
        const RUN_SPEED_MOD = 4;
        const CLIMB_SPEED = 10;
        const DOWN_ATTACK_SPEED = 4;
        const SPIN_SPEED = 2;
        const SPIN_MAX = 2;
        const SYMBOL_SPEED = 16;
        const SWIM_SPEED = 8;

        let animSpeed: number;
        let frame: number;
        let row: number;

        this.sprActionSymbol.animate(this.actionSymbolId, 0, 1, SYMBOL_SPEED, event.step);

        let oldFrame = this.sprSpin.getColumn();
        let s = event.input.getAction("fire2");
        if (this.spinning) {

            this.sprSpin.animate(0, 0, 7, SPIN_SPEED, event.step);
            if (oldFrame > this.sprSpin.getColumn()) {

                if ((++this.spinCount) >= SPIN_MAX || (s & State.DownOrPressed) == 0) {

                    this.spinning = false;
                    this.spinCount = 0;
                }
                else if (s == State.Down) {

                    event.audio.playSample(event.assets.getSample("spin"), 0.50);
                }
            }
            if (this.spinning)
                return;
        }

        if (this.downAttacking) {

            this.spr.animate(5, 0, 3, DOWN_ATTACK_SPEED, event.step);
            return;
        }
        else if (this.downAttackWaitTimer > 0) {

            this.spr.setFrame(0, 5);
            return;
        }

        if (this.sliding) {

            this.spr.setFrame(0, 1);
            return;
        }

        if (this.throwing) {

            this.spr.animate(3, 0, 2, this.spr.getColumn() == 1 ? 12 : 6, event.step);
            if (this.spr.getColumn() == 2) {

                if (this.climbing)
                    this.spr.setFrame(this.climbFrame, 2);
                else
                    this.spr.setFrame(0, 0);

                this.throwing = false;
            }
            else {

                return;
            }
        }

        if (this.climbing) {

            oldFrame = this.spr.getColumn();

            if (Math.abs(this.speed.y) > EPS)
                this.spr.animate(2, 3, 4, CLIMB_SPEED, event.step);

            if (oldFrame != this.spr.getColumn() &&
                oldFrame != 3) {

                event.audio.playSample(event.assets.getSample("climb"), 0.70);
            }

            return;
        }

        if (this.touchWater) {

            row = this.jumpTimer > 0 ? 6 : 5;

            if (this.jumpTimer > 0 || Math.abs(this.target.x) > EPS ||
                (this.jumpTimer <= 0 && this.spr.getRow() == 6) ||
                this.spr.getRow() < 5 ||
                this.spr.getRow() > 6) {

                this.spr.animate(row, 4, 5, SWIM_SPEED, event.step);
            }

            return;
        }

        if (this.canJump) {

            if (Math.abs(this.speed.x) < EPS) {

                this.spr.setFrame(0, 0);
            }
            else {

                row = this.running ? 1 : 0;

                animSpeed = RUN_SPEED_BASE - Math.abs(this.speed.x) * RUN_SPEED_MOD;
                this.spr.animate(row, 1, 4, animSpeed | 0, event.step);
            }
        }
        else {

            frame = 1;
            if (this.speed.y > JUMP_EPS)
                frame = 2;
            else if (this.speed.y < -JUMP_EPS)
                frame = 0;

            if (this.flapping)
                frame = 3;

            if ((this.doubleJump && this.jumpTimer > 0) || this.flapping) {

                row = 7;
            }
            else {

                row = 2;
            }
            this.spr.setFrame(frame, row);
        }
    }


    private updateJump(event: CoreEvent) {

        const DOUBLE_JUMP_SPEED_DELTA = -0.30;
        const DOUBLE_JUMP_MIN = -1.25;

        if (this.jumpMargin > 0) {

            this.jumpMargin -= event.step;
        }

        if (this.jumpTimer > 0) {

            if (this.canJump) {

                this.jumpTimer = 0;
            }
            else {

                this.jumpTimer -= event.step;

                if (this.doubleJump) {

                    this.speed.y = Math.max(DOUBLE_JUMP_MIN,
                        this.speed.y + DOUBLE_JUMP_SPEED_DELTA * event.step);
                }
                else {

                    this.speed.y = -this.jumpSpeed;
                    if (this.touchWater) {

                        this.speed.y /= 2;
                    }
                }

                if (this.jumpTimer <= 0 && this.doubleJump) {

                    this.jumpReleased = true;
                    this.flapping = true;
                }
            }
        }
    }


    private updateDust(event: CoreEvent) {

        const DUST_GEN_TIME_BASE = 8;
        const DUST_GEN_TIME_ROCKET = 6;
        const DUST_ANIM_SPEED = 8;
        const EPS = 0.01;
        const ROCKET_DOWN_SPEED_UP = 0.5;
        const ROCKET_DOWN_SPEED_FLOAT = 1.0;

        for (let d of this.dust) {

            d.update(event);
        }

        let rocketActive = !this.spinning &&
            !this.throwing &&
            ((this.doubleJump && this.jumpTimer > 0) || this.flapping);

        if (!rocketActive && (this.sliding || !this.canJump || this.spinning ||
            this.knockbackTimer > 0 ||
            Math.abs(this.speed.x) <= EPS)) return;

        let dir = this.flip == Flip.None ? 1 : -1;

        let genTime = DUST_GEN_TIME_BASE / Math.abs(this.speed.x);
        let speed = new Vector2();
        let pos = new Vector2(
            this.pos.x - 2 * dir,
            this.pos.y + 6);

        if (rocketActive) {

            speed.y = this.flapping ? ROCKET_DOWN_SPEED_FLOAT : ROCKET_DOWN_SPEED_UP;
            genTime = DUST_GEN_TIME_ROCKET;

            pos.x -= dir;
        }

        if ((this.dustTimer += event.step) >= genTime) {

            nextObject(this.dust, Dust)
                .spawn(pos.x, pos.y, DUST_ANIM_SPEED, speed,
                    rocketActive ? 1 : 0);

            if (rocketActive) {

                event.audio.playSample(event.assets.getSample("rocket"), 0.50);
            }

            this.dustTimer -= genTime;
        }
    }


    protected resetFlags() {

        this.canJump = false;
        this.touchLadder = false;
        this.isLadderTop = false;
        this.showActionSymbol = false;
        this.holdingItem = false;
        this.touchWater = false;
        this.hasTeleported = false;
        this.actionSymbolId = 0;
    }


    protected preMovementEvent(event: CoreEvent) {
        Player.instance = this;
        const INV_TIME = 60;

        this.takeCameraBorderCollision = this.isInFinalArea || this.knockbackTimer > 0;

        this.updateDust(event);

        if (this.knockbackTimer > 0) {

            if ((this.knockbackTimer -= event.step) <= 0) {

                if (this.health <= 0) {

                    this.startDeath(event);
                }
                else {

                    this.invulnerabilityTimer = INV_TIME;
                }
            }
            this.resetFlags();

            return;
        }

        this.control(event);
        this.animate(event);
        this.updateJump(event);

        this.resetFlags();

        if (this.invulnerabilityTimer > 0) {

            this.invulnerabilityTimer -= event.step;
        }
    }


    protected die(event: CoreEvent): boolean {

        const DEATH_TIME = 90;
        const ANIM_SPEED = 4;

        for (let d of this.dust) {

            d.update(event);
        }

        this.spr.animate(7, 4, 7, ANIM_SPEED, event.step);

        return (this.deathTimer += event.step) > DEATH_TIME;
    }


    private resetProperties(stop: boolean) {

        if (stop) {

            this.stopMovement();
        }

        this.doubleJump = false;
        this.downAttacking = false;
        this.downAttackWaitTimer = 0;

        this.jumpTimer = 0;
        this.throwing = false;
        this.climbing = false;
        this.touchLadder = false;
        this.running = false;
        this.flapping = false;
        this.spinning = false;
        this.touchWater = false;

        this.target.y = BASE_GRAVITY;
    }


    private markRoomVisited(x: number, y: number, stage: Stage) {

        let w = Math.floor(stage.width / 10);
        x = negMod(x, w);

        this.progress.addValueToArray("roomVisited", y * w + x, true);
    }


    public stageEvent(stage: Stage, camera: Camera) {

        let cp: Vector2;

        if (this.hasTeleported) {

            cp = camera.getRealPosition();

            this.markRoomVisited(cp.x, cp.y, stage);
            this.hasTeleported = false;
        }
    }


    public cameraMovement(camera: Camera, event: CoreEvent) {

        const MOVE_SPEED = 12;

        let actualSpeed = MOVE_SPEED * camera.getSpeed();
        let dir = camera.getDirection();

        this.pos.x += actualSpeed * dir.x * event.step;
        this.pos.y += actualSpeed * dir.y * event.step;

        this.animate(event);
    }


    public cameraEvent(camera: Camera, stage: Stage, event: CoreEvent) {

        const CAMERA_MOVE_SPEED = 1.0 / 20.0;
        const HIT_RANGE_X = 4;
        const HIT_RANGE_Y = 4;
        const TOP_EXTRA_MARGIN = 1;

        let p = camera.getPosition();

        /*
        if (this.knockbackTimer > 0) {

            this.wallCollision(p.x, p.y, camera.height, -1, event, true);
            this.wallCollision(p.x+160, p.y, camera.height, 1, event, true);
        }
        */

        let x1 = p.x;
        let y1 = p.y;
        let x2 = p.x + camera.width;
        let y2 = p.y + camera.height;

        let dirx = 0;
        let diry = 0;

        let extraMargin = this.climbing ? 0 : TOP_EXTRA_MARGIN;

        if (this.pos.x - HIT_RANGE_X < x1)
            dirx = -1;
        else if (this.pos.x + HIT_RANGE_X > x2)
            dirx = 1;
        else if (this.pos.y - HIT_RANGE_Y + extraMargin < y1 && !this.downAttacking)
            diry = -1;
        else if (this.pos.y + HIT_RANGE_Y > y2)
            diry = 1;

        if (this.isInFinalArea)
            dirx = 0;

        let cp: Vector2;
        if (dirx != 0 || diry != 0) {

            camera.move(dirx, diry, CAMERA_MOVE_SPEED);

            cp = camera.getRealPosition();
            cp.x += dirx;
            cp.y += diry;

            this.markRoomVisited(cp.x, cp.y, stage);
        }
    }


    public preDraw(canvas: Canvas) {

        for (let d of this.dust) {

            d.draw(canvas);
        }
    }


    private drawDeath(canvas: Canvas) {

        const BALL_SPEED = 1.0;
        const BALL_COUNT = 8;

        let bmp = canvas.assets.getBitmap("player");

        let r = this.deathTimer * BALL_SPEED;
        let x: number;
        let y: number;

        let angle = 0;
        for (let i = 0; i < BALL_COUNT; ++i) {

            angle = Math.PI * 2 / BALL_COUNT * i;

            x = this.pos.x + this.center.x + Math.cos(angle) * r;
            y = this.pos.y + this.center.y + Math.sin(angle) * r;

            canvas.drawSprite(this.spr, bmp, Math.floor(x) - 8, Math.floor(y) - 8);
        }
    }


    public draw(canvas: Canvas) {

        if (!this.exist) return;

        if (this.dying) {

            this.drawDeath(canvas);
            return;
        }

        let px = Math.round(this.pos.x - this.spr.width / 2);
        let py = Math.round(this.pos.y - this.spr.height / 2);

        if (this.showActionSymbol) {

            canvas.drawSprite(this.sprActionSymbol,
                canvas.assets.getBitmap("symbol"),
                px, py - 14);
        }

        if (!this.exist ||
            (this.invulnerabilityTimer > 0 &&
                Math.floor(this.invulnerabilityTimer / 4) % 2 == 0))
            return;

        if (this.spinning) {

            canvas.drawSprite(this.sprSpin,
                canvas.assets.getBitmap("spin"),
                px - 8, py, this.flip);
        }
        else {

            canvas.drawSprite(this.spr,
                canvas.assets.getBitmap("player"),
                px, py, this.flip);
        }

        if (this.holdingItem) {

            canvas.drawBitmapRegion(canvas.assets.getBitmap("items"),
                this.itemID * 16, 0, 16, 16,
                px, py - 17);
        }
    }


    protected verticalCollisionEvent(dir: number, event: CoreEvent) {

        const JUMP_MARGIN = 12;
        const HIT_WAIT = 30;
        const HIT_MAGNITUDE = 2;

        if (dir == 1) {

            this.canJump = true;
            this.jumpMargin = JUMP_MARGIN;
            this.jumpTimer = 0;

            this.doubleJump = false;
            this.climbing = false;
            this.canThrow = true;
            this.canSpin = true;

            if (this.downAttacking) {

                this.downAttacking = false;
                this.downAttackWaitTimer = HIT_WAIT;

                event.shake(HIT_WAIT, HIT_MAGNITUDE);
                event.audio.playSample(event.assets.getSample("shake"), 0.50);
            }
        }
        else {

            this.jumpTimer = 0;
            if (this.doubleJump) {

                this.jumpReleased = true;
                this.flapping = true;
            }
        }
    }


    protected wallCollisionEvent(dir: number, event: CoreEvent) {

        this.sliding = false;
        this.slideTimer = 0;
    }


    public ladderCollision(x: number, y: number, w: number, h: number,
        ladderTop: boolean, event: CoreEvent): boolean {

        if (boxOverlay(this.pos, this.center, this.collisionBox, x, y, w, h)) {

            this.climbX = x + w / 2;
            this.touchLadder = !ladderTop || !this.climbing;
            this.isLadderTop = this.isLadderTop || ladderTop;

            if (!this.climbing) {

                this.showActionSymbol = true;
                this.actionSymbolId = ladderTop ? 1 : 0;
            }

            return true;
        }
        return false;
    }


    public breakCollision(x: number, y: number, w: number, h: number,
        level: number, event: CoreEvent): boolean {

        const Y_OFF = -4;
        const HEAD_TOUCH_HEIGHT = 8;

        y += Y_OFF;

        if (level == 1)
            return false;

        if (this.spinning &&
            this.progress.doesValueExistInArray("items", 8)) {

            return boxOverlay(this.pos, new Vector2(0, -this.spinHitbox.y / 2),
                this.spinHitbox, x, y, w, h);
        }

        if (this.speed.y < 0 &&
            this.progress.doesValueExistInArray("items", 10)) {

            if (boxOverlay(this.pos,
                new Vector2(0, -this.collisionBox.y / 2),
                new Vector2(this.collisionBox.x, HEAD_TOUCH_HEIGHT),
                x, y, w, h)) {

                this.speed.y = 0;
                this.jumpTimer = 0;

                return true;
            }
        }

        if (!this.downAttacking || this.speed.y <= 0)
            return false;

        return boxOverlay(this.pos, this.center, this.collisionBox, x, y, w, h);
    }



    private hurt(dir: number, event: CoreEvent) {

        const KNOCKBACK_TIME = 30;
        const KNOCKBACK_SPEED = 2.0;

        this.spr.setFrame(4, 3);
        this.knockbackTimer = KNOCKBACK_TIME;

        if (dir == 0)
            dir = -this.faceDir;

        this.target.x = 0;
        this.speed.x = KNOCKBACK_SPEED * dir;

        this.resetProperties(false);

        this.health = Math.max(0, this.health - 1);

        event.audio.playSample(event.assets.getSample("hurt"), 0.60);
    }


    public hurtCollision(x: number, y: number,
        w: number, h: number, dir: number,
        event: CoreEvent): boolean {

        if (this.dying ||
            this.invulnerabilityTimer > 0 ||
            this.knockbackTimer > 0) return false;

        if (boxOverlay(this.pos, this.center, this.hitbox, x, y, w, h)) {

            this.hurt(dir, event);
            return true;
        }

        return false;
    }


    public windCollision(x: number, y: number, w: number, h: number,
        event: CoreEvent): boolean {

        const SPEED_DOWN = -0.5;
        const MIN_SPEED = -3.0;

        if (boxOverlay(this.pos, this.center, this.hitbox, x, y, w, h)) {

            this.flapping = false;
            this.downAttacking = false;
            this.downAttackWaitTimer = 0;
            this.jumpReleased = false;
            this.speed.y = Math.max(MIN_SPEED, this.speed.y + SPEED_DOWN * event.step);
            return true;
        }
        return false;
    }


    public waterCollision(x: number, y: number, w: number, h: number,
        top: boolean, event: CoreEvent): boolean {

        const UP_SPEED = -0.25;

        if (this.inside) return false;

        if (boxOverlay(this.pos, this.center, this.hitbox, x, y, w, h)) {

            // this.canJump = true;
            this.jumpMargin = 1;
            this.touchWater = true;
            this.canThrow = true;
            this.canSpin = true;
            this.flapping = false;
            this.doubleJump = false;

            this.downAttacking = false;
            this.downAttackWaitTimer = 0;

            if (!top && !this.progress.doesValueExistInArray("items", 7)) {

                this.speed.y += UP_SPEED * event.step;
            }
        }

        return false;
    }


    public projectileCollision(p: Projectile, event: CoreEvent): boolean {

        if (p.isFriendly() ||
            p.isDying() || !p.doesExist() ||
            !this.doesExist() ||
            this.dying ||
            this.invulnerabilityTimer > 0 ||
            this.knockbackTimer > 0) return false;

        if (this.overlayObject(p)) {

            this.hurt(Math.sign(this.pos.x - p.getPos().x), event);
            p.destroy(event);

            return true;
        }
        return false;
    }


    public makeJump(speed: number) {

        if (this.downAttacking) return;

        this.speed.y = speed;

        this.flapping = false;
        this.jumpReleased = false;
        this.doubleJump = false;
        this.canSpin = true;
        this.canThrow = true;
    }


    public checkLoop(stage: Stage) {

        this.pos.x = negMod(this.pos.x, stage.width * 16);
    }


    public touchGround = (): boolean => this.canJump &&
        !this.downAttacking &&
        this.downAttackWaitTimer <= 0 &&
        !this.throwing &&
        !this.sliding &&
        !this.climbing &&
        this.knockbackTimer <= 0;


    public showSymbol() {

        this.showActionSymbol = true;
        this.actionSymbolId = 0;
    }


    public setObtainItemPose(itemID: number) {

        this.stopMovement();
        this.spr.setFrame(4, 4);

        this.showActionSymbol = false;
        this.holdingItem = true;

        this.itemID = itemID;
    }


    public setUsePose(pos = -1, handsUp = false) {

        this.stopMovement();
        this.spr.setFrame(handsUp ? 5 : 3, 3);

        if (pos >= 0) {

            this.pos.x = pos;
        }

        this.showActionSymbol = false;
    }


    public teleportTo(pos: Vector2, setPose = true, inside = false) {

        if (setPose) {

            this.spr.setFrame(2, 3);
        }

        this.inside = inside;
        this.pos = pos.clone();

        this.hasTeleported = true;
    }


    public checkSpinOverlay = (o: WeakGameObject): boolean =>
        this.spinning &&
        o.overlayObjectSpecialHitbox(this, new Vector2(0, -this.spinHitbox.y / 2),
            this.spinHitbox);


    public isInside = (): boolean => this.inside;

    public maxHealth = (): number => this.progress.doesValueExistInArray("items", 9) ? 4 : 3;
    public getHealth = (): number => this.health;

    public isDownAttacking = (): boolean => this.downAttacking;
    public isSpinning = (): boolean => this.spinning;


    public getActiveCheckpointReference = (): SavePoint => this.activeCheckpoint;
    public setActiveCheckpointReference(p: SavePoint) {

        this.activeCheckpoint = p;
    }

    public resetActiveCheckpointReference = (): void => this.activeCheckpoint = null;


    public maximizeHealth() {

        this.health = this.maxHealth();
    }


    public respawn() {

        if (this.activeCheckpoint == null) {

            this.pos = this.startPos.clone();
            this.inside = this.startInside;
        }
        else {

            this.pos = this.activeCheckpoint.getPos().clone();
            this.pos.y += 1;

            this.inside = false;
        }

        this.exist = true;
        this.dying = false;

        this.flip = Flip.None;
        this.invulnerabilityTimer = 0;
        this.knockbackTimer = 0;

        this.spr.setFrame(5, 1);

        this.resetProperties(true);
        this.resetFlags();
        this.canJump = true;

        this.maximizeHealth();
    }


    // "kill" is reserved...
    public startDeath(event: CoreEvent) {

        if (this.dying) return;

        this.health = 0;
        this.deathTimer = 0;
        this.dying = true;

        event.audio.stopMusic();
        event.audio.playSample(event.assets.getSample("die"), 0.45);
    }


    public setSleepPose() {

        this.spr.setFrame(5, 1);
    }


    public isSwimming = (): boolean => this.touchWater;
}
