/* particles.js — animated particle field with connecting lines */
(function(){
  const canvas = document.getElementById('particles');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const COUNT = 90;
  const LINK_DIST = 130;
  const mouse = { x: null, y: null, radius: 160 };

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function makeParticle(){
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2.2 + 0.6,
      hue: Math.random() > 0.5 ? 180 : 38, // cyan or amber
      alpha: Math.random() * 0.5 + 0.3,
    };
  }
  for(let i=0;i<COUNT;i++) particles.push(makeParticle());

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, {passive:true});
  window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

  function draw(){
    ctx.clearRect(0,0,w,h);
    // links
    for(let i=0;i<particles.length;i++){
      const p = particles[i];
      for(let j=i+1;j<particles.length;j++){
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.hypot(dx,dy);
        if(d < LINK_DIST){
          const a = (1 - d/LINK_DIST) * 0.22;
          ctx.strokeStyle = p.hue === 180
            ? `rgba(0,245,255,${a})`
            : `rgba(255,170,0,${a})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(q.x,q.y);
          ctx.stroke();
        }
      }
    }
    // particles
    for(const p of particles){
      // mouse interaction
      if(mouse.x !== null){
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d = Math.hypot(dx,dy);
        if(d < mouse.radius && d > 0){
          const force = (mouse.radius - d)/mouse.radius;
          p.vx += (dx/d) * force * 0.4;
          p.vy += (dy/d) * force * 0.4;
        }
      }
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.985; p.vy *= 0.985;
      // gentle drift
      p.vx += (Math.random()-0.5)*0.02;
      p.vy += (Math.random()-0.5)*0.02;
      if(p.x < 0) p.x = w; if(p.x > w) p.x = 0;
      if(p.y < 0) p.y = h; if(p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = p.hue === 180
        ? `rgba(0,245,255,${p.alpha})`
        : `rgba(255,170,0,${p.alpha})`;
      ctx.fill();
      // glow
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3);
      g.addColorStop(0, p.hue===180?'rgba(0,245,255,0.18)':'rgba(255,170,0,0.18)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
