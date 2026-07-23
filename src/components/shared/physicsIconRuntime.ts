import type { Body, Engine, Mouse } from 'matter-js';

type MatterModule = typeof import('matter-js');

interface Sprite {
	body: Body;
	element: HTMLSpanElement;
	width: number;
	height: number;
}

const WALL_SIZE = 100;

class PhysicsIconManager {
	private matter: MatterModule | null = null;
	private engine: Engine | null = null;
	private main: HTMLElement | null = null;
	private layer: HTMLDivElement | null = null;
	private boundaries: Body[] = [];
	private sprites: Sprite[] = [];

	// Matter binds a canvas-oriented wheel handler that blocks page scrolling.
	private unbindMouseWheelListeners(mouse: Mouse): void {
		const wheelHandler = (
			mouse as Mouse & { mousewheel: EventListener }
		).mousewheel;

		mouse.element.removeEventListener('wheel', wheelHandler);
		mouse.element.removeEventListener('DOMMouseScroll', wheelHandler);
	}

	private syncBounds = (): void => {
		if (!this.matter || !this.engine || !this.main || !this.layer) return;

		const width = this.main.clientWidth;
		const height = this.main.clientHeight;
		const halfWall = WALL_SIZE / 2;
		const options = { isStatic: true, render: { visible: false } };

		this.matter.Composite.remove(this.engine.world, this.boundaries);
		this.boundaries = [
			this.matter.Bodies.rectangle(
				width / 2,
				height + halfWall,
				width + WALL_SIZE * 2,
				WALL_SIZE,
				options
			),
			this.matter.Bodies.rectangle(
				-halfWall,
				height / 2,
				WALL_SIZE,
				height + WALL_SIZE * 2,
				options
			),
			this.matter.Bodies.rectangle(
				width + halfWall,
				height / 2,
				WALL_SIZE,
				height + WALL_SIZE * 2,
				options
			),
			this.matter.Bodies.rectangle(
				width / 2,
				-halfWall,
				width + WALL_SIZE * 2,
				WALL_SIZE,
				options
			),
		];
		this.matter.Composite.add(this.engine.world, this.boundaries);
	};

	private syncSprites = (): void => {
		for (const sprite of this.sprites) {
			const x = sprite.body.position.x - sprite.width / 2;
			const y = sprite.body.position.y - sprite.height / 2;
			sprite.element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${sprite.body.angle}rad)`;
		}
	};

	private async ensureReady(main: HTMLElement): Promise<void> {
		if (this.engine) return;

		const Matter = await import('matter-js');
		const engine = Matter.Engine.create();
		const runner = Matter.Runner.create();
		const layer = document.createElement('div');

		layer.className = 'physics-icon-layer';
		main.append(layer);

		this.matter = Matter;
		this.engine = engine;
		this.main = main;
		this.layer = layer;

		const mouse = Matter.Mouse.create(main);
		this.unbindMouseWheelListeners(mouse);
		const mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse,
			constraint: {
				stiffness: 0.18,
				damping: 0.12,
				render: { visible: false },
			},
		});

		Matter.Composite.add(engine.world, mouseConstraint);
		Matter.Events.on(engine, 'afterUpdate', this.syncSprites);
		Matter.Runner.run(runner, engine);
		new ResizeObserver(this.syncBounds).observe(main);
		this.syncBounds();
	}

	public async activate(trigger: HTMLElement): Promise<void> {
		const main = trigger.closest<HTMLElement>('.site-main');
		const template = trigger.querySelector<HTMLElement>(
			'[data-physics-icon-template]'
		);
		const icon =
			trigger.dataset.physicsShape === 'rectangle'
				? template
				: template?.firstElementChild;
		if (!main || !template || !icon) return;

		await this.ensureReady(main);
		if (!this.matter || !this.engine || !this.layer || !this.main) return;

		const mainRect = this.main.getBoundingClientRect();
		const iconRect = template.getBoundingClientRect();
		const x = iconRect.left - mainRect.left + iconRect.width / 2;
		const y = iconRect.top - mainRect.top + iconRect.height / 2;
		const options = {
			restitution: 0.45,
			friction: 0.2,
			frictionAir: 0.01,
		};
		const body =
			trigger.dataset.physicsShape === 'rectangle'
				? this.matter.Bodies.rectangle(
						x,
						y,
						iconRect.width,
						iconRect.height,
						{
							...options,
							chamfer: { radius: iconRect.height / 2 },
						}
					)
				: this.matter.Bodies.circle(
						x,
						y,
						Math.max(iconRect.width, iconRect.height) / 2,
						options
					);
		const element = document.createElement('span');

		element.className = 'physics-icon-body';
		element.style.width = `${iconRect.width}px`;
		element.style.height = `${iconRect.height}px`;
		element.append(icon.cloneNode(true));
		this.layer.append(element);
		const sprite = {
			body,
			element,
			width: iconRect.width,
			height: iconRect.height,
		};
		this.sprites.push(sprite);
		this.matter.Composite.add(this.engine.world, body);
		this.matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
		this.syncSprites();

		trigger.dataset.activated = 'true';
		trigger.tabIndex = -1;
	}
}

declare global {
	interface Window {
		__physicsIconManager?: PhysicsIconManager;
	}
}

function manager(): PhysicsIconManager {
	return (window.__physicsIconManager ??= new PhysicsIconManager());
}

export function registerPhysicsIconBindings(): void {
	document
		.querySelectorAll<HTMLElement>('[data-physics-icon]')
		.forEach((icon) => {
			if (icon.dataset.physicsIconBound === 'true') return;
			icon.dataset.physicsIconBound = 'true';
			let activated = false;

			const activate = () => {
				if (activated) return;
				activated = true;
				void manager().activate(icon);
			};

			if (icon.dataset.physicsActivation === 'click') {
				icon.addEventListener('click', activate, { once: true });
			} else {
				icon.addEventListener('pointerenter', activate, { once: true });
				icon.addEventListener('pointerdown', activate, { once: true });
			}
			icon.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				activate();
			});
		});
}
