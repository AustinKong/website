import type { Body, Engine, Mouse } from 'matter-js';

type MatterModule = typeof import('matter-js');

interface Sprite {
	body: Body;
	element: HTMLSpanElement;
	width: number;
	height: number;
}

const WALL_SIZE = 100;

type MatterMouse = Mouse & {
	mousedown: EventListener;
	mousemove: EventListener;
	mouseup: EventListener;
	mousewheel: EventListener;
};

class PhysicsManager {
	private matter: MatterModule | null = null;
	private engine: Engine | null = null;
	private main: HTMLElement | null = null;
	private layer: HTMLDivElement | null = null;
	private boundaries: Body[] = [];
	private sprites: Sprite[] = [];

	private preservePageInput(mouse: Mouse, physicsLayer: HTMLElement): void {
		const handlers = mouse as MatterMouse;

		mouse.element.removeEventListener('wheel', handlers.mousewheel);
		mouse.element.removeEventListener('DOMMouseScroll', handlers.mousewheel);
		mouse.element.removeEventListener('touchmove', handlers.mousemove);
		mouse.element.removeEventListener('touchstart', handlers.mousedown);
		mouse.element.removeEventListener('touchend', handlers.mouseup);

		physicsLayer.addEventListener('touchmove', handlers.mousemove, {
			passive: false,
		});
		physicsLayer.addEventListener('touchstart', handlers.mousedown, {
			passive: false,
		});
		physicsLayer.addEventListener('touchend', handlers.mouseup, {
			passive: false,
		});
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

		layer.className = 'physics-object-layer';
		main.append(layer);

		this.matter = Matter;
		this.engine = engine;
		this.main = main;
		this.layer = layer;

		const mouse = Matter.Mouse.create(main);
		this.preservePageInput(mouse, layer);
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
		const main = trigger.closest<HTMLElement>('main');
		const template = trigger.querySelector<HTMLElement>(
			'[data-physics-template]'
		);
		if (!main || !template) return;

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
		const body = this.matter.Bodies.rectangle(
			x,
			y,
			iconRect.width,
			iconRect.height,
			{
				...options,
				chamfer: { radius: iconRect.height / 2 },
			}
		);
		const element = document.createElement('span');

		element.className = 'physics-object-body';
		element.style.width = `${iconRect.width}px`;
		element.style.height = `${iconRect.height}px`;
		element.append(template.cloneNode(true));
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
		__physicsManager?: PhysicsManager;
	}
}

function manager(): PhysicsManager {
	return (window.__physicsManager ??= new PhysicsManager());
}

export function registerPhysicsBindings(): void {
	document
		.querySelectorAll<HTMLElement>('[data-physics-object]')
		.forEach((object) => {
			if (object.dataset.physicsBound === 'true') return;
			object.dataset.physicsBound = 'true';
			let activated = false;

			const activate = () => {
				if (activated) return;
				activated = true;
				void manager().activate(object);
			};

			object.addEventListener('click', activate, { once: true });
			object.addEventListener('keydown', (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				activate();
			});
		});
}
