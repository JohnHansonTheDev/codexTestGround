import React, { useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import * as THREE from 'https://esm.sh/three@0.160.0';
import { animate, stagger } from 'https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm';

const AGENT_NAME = 'NOVA';

const cannedResponses = [
  {
    test: /(who|what).*you|name/i,
    answer: `I'm ${AGENT_NAME}, your launch agent. I blend visual storytelling, voice guidance, and instant help right here in the intro.`,
  },
  {
    test: /(react|three|motion|stack|tech)/i,
    answer:
      'This experience runs on React for UI orchestration, Three.js for cinematic 3D graphics, and motion.dev for high-impact animations.',
  },
  {
    test: /(help|support|agent|ask)/i,
    answer:
      'You can ask me anything about this demo, how it works, or what to build next. Try: “Give me a product idea” or “How do I deploy this?”',
  },
  {
    test: /(gemini|design|compare)/i,
    answer:
      'Let\'s just say this intro was designed to feel bold, futuristic, and unforgettable — a high-energy creative statement.',
  },
];

function resolveAgentReply(input) {
  const hit = cannedResponses.find((entry) => entry.test.test(input));
  if (hit) return hit.answer;

  const ideas = [
    'Turn this into a landing page for your AI product with pricing, testimonials, and a live demo CTA.',
    'Add voice commands so I can respond hands-free while the 3D scene reacts in real time.',
    'Connect this chat box to a backend model endpoint and make me a fully autonomous support co-pilot.',
  ];

  return `Great question. Here\'s a creative direction: ${ideas[Math.floor(Math.random() * ideas.length)]}`;
}

function App() {
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const panelRef = useRef(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      role: 'agent',
      text: `Welcome to the future. I'm ${AGENT_NAME}, your creative support agent. Ask me anything.`,
    },
  ]);

  const lastAgentMessage = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'agent')?.text || '',
    [messages],
  );

  useEffect(() => {
    const heroNodes = heroRef.current?.querySelectorAll('.reveal') ?? [];
    if (heroNodes.length > 0) {
      animate(
        heroNodes,
        { opacity: [0, 1], y: [36, 0], filter: ['blur(10px)', 'blur(0px)'] },
        { delay: stagger(0.12), duration: 0.9, easing: 'ease-out' },
      );
    }

    if (panelRef.current) {
      animate(panelRef.current, { opacity: [0, 1], x: [30, 0] }, { duration: 0.9, delay: 0.45 });
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#06070b', 0.055);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const ambient = new THREE.AmbientLight('#8ab4ff', 0.75);
    const key = new THREE.PointLight('#9f7bff', 2.2, 100);
    key.position.set(3, 2, 5);
    const fill = new THREE.PointLight('#24d6b5', 1.8, 100);
    fill.position.set(-4, -1, 4);
    scene.add(ambient, key, fill);

    const coreGeometry = new THREE.IcosahedronGeometry(1.35, 2);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: '#85a7ff',
      metalness: 0.25,
      roughness: 0.1,
      transmission: 0.25,
      clearcoat: 0.5,
      emissive: '#3452ff',
      emissiveIntensity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    const ringGroup = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2 + i * 0.45, 0.03 + i * 0.01, 16, 180),
        new THREE.MeshStandardMaterial({
          color: ['#c8d6ff', '#8be8ff', '#80ffd8'][i],
          emissive: ['#5b79ff', '#2ab8ff', '#20cd9a'][i],
          emissiveIntensity: 0.65,
          metalness: 0.6,
          roughness: 0.25,
        }),
      );
      ring.rotation.set(Math.random(), Math.random(), Math.random());
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const positionArray = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      positionArray[i] = (Math.random() - 0.5) * 80;
      positionArray[i + 1] = (Math.random() - 0.5) * 80;
      positionArray[i + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({ color: '#9ab7ff', size: 0.04, transparent: true, opacity: 0.8 }),
    );
    scene.add(stars);

    let rafId;
    const clock = new THREE.Clock();

    const animateScene = () => {
      const t = clock.getElapsedTime();
      coreMesh.rotation.x = t * 0.35;
      coreMesh.rotation.y = t * 0.5;
      coreMesh.position.y = Math.sin(t * 1.2) * 0.2;

      ringGroup.rotation.x = t * 0.18;
      ringGroup.rotation.y = -t * 0.24;
      ringGroup.rotation.z = Math.sin(t * 0.8) * 0.25;

      stars.rotation.y = t * 0.018;
      stars.rotation.x = Math.sin(t * 0.1) * 0.08;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animateScene);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    animateScene();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      starsGeo.dispose();
    };
  }, []);

  useEffect(() => {
    if (!lastAgentMessage || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(lastAgentMessage);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en-US|Google US English|Samantha|Daniel/i.test(v.name));
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [lastAgentMessage]);

  const onSubmit = (event) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;

    const reply = resolveAgentReply(value);
    setMessages((prev) => [...prev, { role: 'user', text: value }, { role: 'agent', text: reply }]);
    setInput('');
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('canvas', { ref: canvasRef, className: 'bg-canvas', 'aria-hidden': 'true' }),
    React.createElement(
      'main',
      { className: 'app-shell' },
      React.createElement(
        'section',
        { className: 'hero', ref: heroRef },
        React.createElement('p', { className: 'kicker reveal' }, 'AGENTIC IMMERSIVE INTRO'),
        React.createElement('h1', { className: 'headline reveal' }, 'Hello World, Reimagined.'),
        React.createElement(
          'p',
          { className: 'subheadline reveal' },
          'An insane cinematic opening powered by React + Three.js + motion.dev, with a voice-enabled AI support agent built in.',
        ),
      ),
      React.createElement(
        'aside',
        { className: 'agent-panel', ref: panelRef },
        React.createElement('h2', null, `${AGENT_NAME} // Live Support Agent`),
        React.createElement(
          'div',
          { className: 'messages' },
          messages.map((message, index) =>
            React.createElement(
              'div',
              { key: `${message.role}-${index}`, className: `message ${message.role}` },
              message.text,
            ),
          ),
        ),
        React.createElement(
          'form',
          { className: 'composer', onSubmit },
          React.createElement('input', {
            type: 'text',
            value: input,
            onChange: (event) => setInput(event.target.value),
            placeholder: 'Ask NOVA anything…',
            'aria-label': 'Ask the support agent',
          }),
          React.createElement('button', { type: 'submit' }, 'Send'),
        ),
      ),
    ),
  );
}

const rootElement = document.getElementById('root');
createRoot(rootElement).render(React.createElement(App));
