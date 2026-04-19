import type { Body, Engine, Mouse, MouseConstraint, Runner } from 'matter-js';
import pacmanGif from '../../assets/pac-man.gif';

type MatterModule = typeof import('matter-js');

interface PhysicsSprite {
	body: Body;
	element: HTMLDivElement;
	size: number;
}

const MAX_ACTIVE_ICONS = 15;
const WALL_THICKNESS = 120;
const LOCK_SETTLE_MS = 260;
const PACMAN_SWEEP_MS = 5000;
const BOTTOM_LOCK_OFFSET = 26;
const ICON_COLLISION_GROUP = -1337;

class PhysicsIconManager {
	private matterPromise: Promise<MatterModule> | null = null;
	private matter: MatterModule | null = null;
	private engine: Engine | null = null;
	private runner: Runner | null = null;
	private mouseConstraint: MouseConstraint | null = null;
	private layer: HTMLDivElement | null = null;
	private boundaries: Body[] = [];
	private sprites = new Map<number, PhysicsSprite>();
	private insertionOrder: number[] = [];
	private cleanupInProgress = false;

	private readonly handleViewportChange = () => {
		this.syncSceneBounds();
	};

	private readonly handleAfterUpdate = () => {
		this.syncSpritesToDom();
	};

	private async loadMatter(): Promise<MatterModule> {
		if (!this.matterPromise) {
			this.matterPromise = import('matter-js');
		}

		const matter = await this.matterPromise;
		this.matter = matter;
		return matter;
	}

	private getDocumentWidth(): number {
		return Math.max(
			document.documentElement.clientWidth,
			document.body.clientWidth || 0
		);
	}

	private getDocumentHeight(): number {
		const { body, documentElement } = document;

		return Math.max(
			documentElement.scrollHeight,
			body.scrollHeight,
			documentElement.offsetHeight,
			body.offsetHeight,
			documentElement.clientHeight,
			window.innerHeight || 0
		);
	}

	// https://github.com/liabru/matter-js/issues/929
	private unbindMouseWheelListeners(mouse: Mouse): void {
		mouse.element.removeEventListener('wheel', mouse.mousewheel);
		mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
	}

	private syncSceneBounds(): void {
		if (!this.matter || !this.engine || !this.layer) {
			return;
		}

		const Matter = this.matter;
		const world = this.engine.world;
		const width = this.getDocumentWidth();
		const height = this.getDocumentHeight();

		this.layer.style.width = `${width}px`;
		this.layer.style.height = `${height}px`;

		if (this.boundaries.length > 0) {
			Matter.Composite.remove(world, this.boundaries);
		}

		const halfThickness = WALL_THICKNESS / 2;
		const staticOptions = {
			isStatic: true,
			render: { visible: false },
		};

		this.boundaries = [
			Matter.Bodies.rectangle(
				width / 2,
				height + halfThickness,
				width + WALL_THICKNESS * 2,
				WALL_THICKNESS,
				staticOptions
			),
			Matter.Bodies.rectangle(
				-halfThickness,
				height / 2,
				WALL_THICKNESS,
				height + WALL_THICKNESS * 2,
				staticOptions
			),
			Matter.Bodies.rectangle(
				width + halfThickness,
				height / 2,
				WALL_THICKNESS,
				height + WALL_THICKNESS * 2,
				staticOptions
			),
			Matter.Bodies.rectangle(
				width / 2,
				-halfThickness,
				width + WALL_THICKNESS * 2,
				WALL_THICKNESS,
				staticOptions
			),
		];

		Matter.Composite.add(world, this.boundaries);
	}

	private syncSpritesToDom(): void {
		for (const sprite of this.sprites.values()) {
			const x = sprite.body.position.x - sprite.size / 2;
			const y = sprite.body.position.y - sprite.size / 2;

			sprite.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(
				2
			)}px, 0) rotate(${sprite.body.angle}rad)`;
		}
	}

	private removeSprite(id: number): void {
		if (!this.matter || !this.engine) {
			return;
		}

		const sprite = this.sprites.get(id);
		if (!sprite) {
			return;
		}

		this.matter.Composite.remove(this.engine.world, sprite.body);
		sprite.element.remove();
		this.sprites.delete(id);

		const orderIndex = this.insertionOrder.indexOf(id);
		if (orderIndex !== -1) {
			this.insertionOrder.splice(orderIndex, 1);
		}
	}

	private enforceBodyLimit(): void {
		while (this.insertionOrder.length > MAX_ACTIVE_ICONS) {
			const oldestId = this.insertionOrder.shift();

			if (typeof oldestId !== 'number') {
				break;
			}

			this.removeSprite(oldestId);
		}
	}

	private randomBetween(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	private wait(durationMs: number): Promise<void> {
		return new Promise((resolve) => {
			window.setTimeout(resolve, durationMs);
		});
	}

	private lockSpritesNearBottom(): number {
		if (!this.matter || !this.sprites.size) {
			return window.scrollY + window.innerHeight - BOTTOM_LOCK_OFFSET;
		}

		const width = this.getDocumentWidth();
		const viewportBottom = window.scrollY + window.innerHeight;

		for (const id of this.insertionOrder) {
			const sprite = this.sprites.get(id);
			if (!sprite) {
				continue;
			}

			const minX = sprite.size / 2 + 8;
			const maxX = width - sprite.size / 2 - 8;
			const targetX = Math.min(maxX, Math.max(minX, sprite.body.position.x));
			const targetY = viewportBottom - BOTTOM_LOCK_OFFSET - sprite.size / 2;

			sprite.element.style.pointerEvents = 'none';
			sprite.element.style.transition =
				'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';

			sprite.body.collisionFilter.group = ICON_COLLISION_GROUP;
			this.matter.Body.setVelocity(sprite.body, { x: 0, y: 0 });
			this.matter.Body.setAngularVelocity(sprite.body, 0);
			this.matter.Body.setStatic(sprite.body, true);
			this.matter.Body.setPosition(sprite.body, {
				x: targetX,
				y: targetY,
			});
		}

		this.syncSpritesToDom();
		return viewportBottom - BOTTOM_LOCK_OFFSET - 22;
	}

	private async runPacmanSweep(centerY: number): Promise<void> {
		if (!this.layer || this.sprites.size === 0) {
			return;
		}

		const pacman = document.createElement('img');
		pacman.className = 'physics-icon-pacman';
		pacman.src = pacmanGif.src;
		pacman.alt = '';
		pacman.draggable = false;

		const pacmanSize = Math.max(32, Math.min(48, window.innerWidth * 0.1));
		pacman.style.width = `${pacmanSize}px`;
		pacman.style.height = `${pacmanSize}px`;
		this.layer.append(pacman);

		const width = this.getDocumentWidth();
		const startX = -pacmanSize * 1.2;
		const endX = width + pacmanSize * 1.2;
		const totalDistance = endX - startX;
		const iconIds = new Set(this.insertionOrder);
		const topY = centerY - pacmanSize / 2;

		await new Promise<void>((resolve) => {
			const startedAt = performance.now();

			const frame = (now: number) => {
				const progress = Math.min(1, (now - startedAt) / PACMAN_SWEEP_MS);
				const x = startX + totalDistance * progress;

				const renderX = Math.round(x);
				const renderY = Math.round(topY);
				pacman.style.transform = `translate3d(${renderX}px, ${renderY}px, 0)`;

				const biteCenterX = x + pacmanSize * 0.72;
				const biteCenterY = topY + pacmanSize / 2;
				const biteReachX = pacmanSize * 0.34;
				const biteReachY = pacmanSize * 0.32;

				for (const id of Array.from(iconIds)) {
					const sprite = this.sprites.get(id);
					if (!sprite) {
						iconIds.delete(id);
						continue;
					}

					const deltaX = Math.abs(sprite.body.position.x - biteCenterX);
					const deltaY = Math.abs(sprite.body.position.y - biteCenterY);

					if (deltaX <= biteReachX && deltaY <= biteReachY) {
						this.removeSprite(id);
						iconIds.delete(id);
					}
				}

				if (progress >= 1) {
					resolve();
					return;
				}

				window.requestAnimationFrame(frame);
			};

			window.requestAnimationFrame(frame);
		});

		pacman.remove();
	}

	private async ensureReady(): Promise<void> {
		if (this.engine) {
			return;
		}

		const Matter = await this.loadMatter();
		const layer = document.createElement('div');
		layer.className = 'physics-icon-layer';
		document.body.append(layer);

		const engine = Matter.Engine.create();
		engine.gravity.y = 0.9;
		this.engine = engine;
		this.layer = layer;

		const runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		this.runner = runner;

		const mouse = Matter.Mouse.create(document.body);
		this.unbindMouseWheelListeners(mouse);
		const mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse,
			constraint: {
				stiffness: 0.2,
				damping: 0.14,
				render: { visible: false },
			},
		});

		this.mouseConstraint = mouseConstraint;
		Matter.Composite.add(engine.world, mouseConstraint);
		Matter.Events.on(engine, 'afterUpdate', this.handleAfterUpdate);

		window.addEventListener('resize', this.handleViewportChange, {
			passive: true,
		});
		window.addEventListener('orientationchange', this.handleViewportChange, {
			passive: true,
		});

		this.syncSceneBounds();
	}

	public async spawnFromTrigger(triggerEl: HTMLElement): Promise<void> {
		if (this.cleanupInProgress) {
			return;
		}

		await this.ensureReady();

		if (!this.matter || !this.engine || !this.layer) {
			return;
		}

		this.syncSceneBounds();

		const iconTemplateWrapper = triggerEl.querySelector<HTMLElement>(
			'[data-physics-icon-template]'
		);
		const iconTemplate = iconTemplateWrapper?.firstElementChild;

		if (!iconTemplate) {
			return;
		}

		const triggerRect = triggerEl.getBoundingClientRect();
		const spawnX = triggerRect.left + triggerRect.width / 2 + window.scrollX;
		const spawnY = triggerRect.top + triggerRect.height / 2 + window.scrollY;
		const templateRect = iconTemplateWrapper.getBoundingClientRect();
		const fontSize =
			Number.parseFloat(getComputedStyle(triggerEl).fontSize) || 16;
		const size = fontSize * 1.5;
		const radius = size / 2;

		const body = this.matter.Bodies.circle(spawnX, spawnY, radius, {
			restitution: 0.52,
			friction: 0.01,
			frictionAir: 0.018,
			density: 0.0025,
			render: { visible: false },
		});

		this.matter.Body.setVelocity(body, {
			x: this.randomBetween(-3.1, 3.1),
			y: this.randomBetween(-12.2, -8.8),
		});
		this.matter.Body.setAngularVelocity(body, this.randomBetween(-0.28, 0.28));

		const iconElement = document.createElement('div');
		iconElement.className = 'physics-icon-body';
		iconElement.style.width = `${size}px`;
		iconElement.style.height = `${size}px`;
		iconElement.style.color = getComputedStyle(triggerEl).color;

		const iconClone = iconTemplate.cloneNode(true) as Element;
		iconClone.removeAttribute('slot');
		iconElement.append(iconClone);
		this.layer.append(iconElement);

		this.matter.Composite.add(this.engine.world, body);
		this.sprites.set(body.id, {
			body,
			element: iconElement,
			size,
		});
		this.insertionOrder.push(body.id);
		this.enforceBodyLimit();
		this.syncSpritesToDom();
	}

	public async runCleanupSequence(): Promise<void> {
		if (this.cleanupInProgress) {
			return;
		}

		if (!this.engine && this.sprites.size === 0) {
			return;
		}

		await this.ensureReady();

		if (this.sprites.size === 0) {
			return;
		}

		this.cleanupInProgress = true;

		try {
			this.syncSceneBounds();
			const pacmanCenterY = this.lockSpritesNearBottom();
			await this.wait(LOCK_SETTLE_MS + 30);
			await this.runPacmanSweep(pacmanCenterY);

			for (const id of [...this.insertionOrder]) {
				this.removeSprite(id);
			}
		} finally {
			this.cleanupInProgress = false;
		}
	}
}

declare global {
	interface Window {
		__physicsIconManager?: PhysicsIconManager;
	}
}

const getPhysicsIconManager = (): PhysicsIconManager => {
	if (typeof window === 'undefined') {
		throw new Error('Physics icon manager can only run in the browser.');
	}

	if (!window.__physicsIconManager) {
		window.__physicsIconManager = new PhysicsIconManager();
	}

	return window.__physicsIconManager;
};

export const registerPhysicsIconBindings = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	document
		.querySelectorAll<HTMLElement>('[data-physics-icon]')
		.forEach((node) => {
			if (node.dataset.physicsIconBound === 'true') {
				return;
			}

			node.dataset.physicsIconBound = 'true';

			const activate = () => {
				void getPhysicsIconManager().spawnFromTrigger(node);
			};

			node.addEventListener('click', (event) => {
				event.preventDefault();
				activate();
			});

			node.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') {
					return;
				}

				event.preventDefault();
				activate();
			});
		});
};

export const triggerPhysicsIconCleanup = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	void getPhysicsIconManager().runCleanupSequence();
};
