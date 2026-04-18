const { useState, useEffect, useRef, useCallback } = React;

const LOGO_SRC = "assets/logo-recruitin.png";
const FACEBOOK_PIXEL_ID = "FB_PIXEL_ID";
const WIN_HITS = 8;
const GAME_DURATION = 25;
const HIT_SCORE = 100;
const MISS_PENALTY = 50;
const DISCOUNT_CODE = "VACATURE10";
const BRAND = {
  background: "#0f1012",
  panel: "rgba(19,21,24,0.94)",
  panelBorder: "rgba(255,255,255,0.08)",
  accent: "#ff8f35",
  accentSoft: "#ff9f4f",
  success: "#4ade80",
  danger: "#fb7185",
  text: "#f4f4f5",
  muted: "#a1a1aa",
  highlight: "#64d3ff",
  negative: "#ff4d4d",
};

/* ── helpers ── */
const randomBetween = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const formatTimer = (s) => Math.max(0, Math.ceil(s)) + "s";
const uid = (() => {
  let n = 0;
  return () => ++n;
})();

const trackEvent = (name, payload = {}) => {
  console.log("[FB Pixel]", name, payload);
  if (typeof window !== "undefined" && window.fbq)
    window.fbq("track", name, payload);
};

/* ── Web Audio SFX ── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _actx = null;
const actx = () => {
  if (!_actx) _actx = new AudioCtx();
  return _actx;
};

function playTone(freq, dur, type, vol) {
  try {
    const ctx = actx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

const sfx = {
  hit() {
    playTone(880, 0.08, "square", 0.1);
    playTone(1320, 0.06, "sine", 0.06);
  },
  miss() {
    playTone(220, 0.18, "sawtooth", 0.08);
  },
  combo() {
    playTone(1200, 0.06, "sine", 0.1);
    playTone(1600, 0.05, "sine", 0.08);
  },
  start() {
    playTone(660, 0.12, "triangle", 0.08);
  },
  win() {
    playTone(880, 0.15, "sine", 0.1);
    setTimeout(() => playTone(1320, 0.2, "sine", 0.1), 150);
  },
  lose() {
    playTone(180, 0.35, "sawtooth", 0.1);
  },
  tick() {
    playTone(440, 0.04, "sine", 0.05);
  },
  chomp() {
    playTone(260, 0.06, "square", 0.09);
    setTimeout(function () {
      playTone(200, 0.08, "square", 0.07);
    }, 70);
  },
};

/* ── BlueprintBg ── */
function BlueprintBg() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at top left, rgba(255,140,34,0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(99,102,241,0.18), transparent 26%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}

/* ── Particle ── */
function Particle({ p }) {
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.size,
        height: p.size,
        borderRadius: "50%",
        background: p.color,
        pointerEvents: "none",
        opacity: p.opacity,
        transform: "translate(-50%,-50%)",
        zIndex: 20,
      }}
    />
  );
}

/* ── Score Popup ── */
function ScorePopup({ popup }) {
  return (
    <div
      style={{
        position: "absolute",
        left: popup.x,
        top: popup.y,
        transform: "translate(-50%,-50%)",
        pointerEvents: "none",
        zIndex: 25,
        fontFamily: "Archivo Black, sans-serif",
        fontSize: popup.combo > 1 ? 28 : 22,
        color: popup.color,
        textShadow: "0 0 12px " + popup.color + "60",
        opacity: popup.opacity,
      }}
    >
      {popup.text}
    </div>
  );
}

/* ── Pac-Man (de concurrent) ── */
function PacManSprite({ pacman }) {
  var mouth = Math.abs(Math.sin(pacman.age * 12)) * 35 + 5;
  var facingLeft = pacman.dx < 0;
  return (
    <div
      style={{
        position: "absolute",
        left: pacman.x + "%",
        top: pacman.y + "%",
        transform: "translate(-50%,-50%)",
        zIndex: 15,
        pointerEvents: "none",
        transition: "left 0.08s linear, top 0.08s linear",
      }}
    >
      {/* Label */}
      <div
        style={{
          position: "absolute",
          top: -20,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontSize: 10,
          letterSpacing: "0.12em",
          fontFamily: "Archivo Black, sans-serif",
          color: "#ff4d4d",
          textShadow: "0 0 8px rgba(255,77,77,0.5)",
        }}
      >
        CONCURRENT
      </div>
      {/* Pac-Man SVG */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        style={{
          transform: facingLeft ? "scaleX(-1)" : "none",
          filter: "drop-shadow(0 0 8px rgba(255,77,77,0.4))",
        }}
      >
        <circle cx="20" cy="20" r="18" fill="#ff4d4d" />
        {/* mouth cutout */}
        <path
          d={
            "M20,20 L38," +
            (20 - mouth * 0.5) +
            " L38," +
            (20 + mouth * 0.5) +
            " Z"
          }
          fill="#0f1012"
        />
        {/* eye */}
        <circle cx="24" cy="12" r="3" fill="#0f1012" />
        <circle cx="24" cy="12" r="1.5" fill="white" />
      </svg>
    </div>
  );
}

/* ── Animated Figure ── */
function AnimatedFigure({ isTech, color, age }) {
  const bounce = Math.sin(age * 6) * 2;
  const armWave = Math.sin(age * 5) * 8;
  const legL = Math.sin(age * 8) * 2;
  const legR = -legL;
  return (
    <div
      style={{
        width: 36,
        height: 36,
        position: "relative",
        margin: "0 auto 6px",
      }}
    >
      {/* Head */}
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: color,
          position: "absolute",
          top: bounce,
          left: "50%",
          transform: "translateX(-50%)",
          boxShadow: "0 0 10px " + color + "50",
          transition: "top 0.08s",
        }}
      />
      {/* Body */}
      <div
        style={{
          width: 9,
          height: 14,
          background: color,
          position: "absolute",
          top: 11,
          left: "50%",
          transform: "translateX(-50%)",
          borderRadius: "4px 4px 2px 2px",
          opacity: 0.9,
        }}
      />
      {/* Arms */}
      <div
        style={{
          width: 18,
          height: 3,
          background: color,
          position: "absolute",
          top: 15,
          left: "50%",
          transform:
            "translateX(-50%) rotate(" + (isTech ? armWave : 0) + "deg)",
          borderRadius: 2,
          opacity: 0.8,
          transition: "transform 0.08s",
          transformOrigin: "center",
        }}
      />
      {/* Legs */}
      <div
        style={{
          width: 3,
          height: 7,
          background: color,
          position: "absolute",
          top: 23 + (isTech ? legL : 0),
          left: 11,
          borderRadius: 2,
          opacity: 0.7,
          transition: "top 0.08s",
        }}
      />
      <div
        style={{
          width: 3,
          height: 7,
          background: color,
          position: "absolute",
          top: 23 + (isTech ? legR : 0),
          left: 22,
          borderRadius: 2,
          opacity: 0.7,
          transition: "top 0.08s",
        }}
      />
    </div>
  );
}

/* ── TargetCard ── */
function TargetCard({ target, onClick }) {
  const isSkip = target.role === "HR" || target.flipped;
  const color = isSkip ? BRAND.negative : BRAND.highlight;
  const lifeRatio = 1 - target.age / target.lifetime;

  return (
    <button
      type="button"
      onClick={() => onClick(target.id)}
      style={{
        position: "absolute",
        left: target.x + "%",
        top: target.y + "%",
        transform: "translate(-50%,-50%)",
        width: 120,
        padding: "14px 16px",
        borderRadius: 20,
        border:
          "2px solid " +
          (isSkip ? "rgba(255,77,77,0.35)" : "rgba(100,211,255,0.35)"),
        background: "rgba(6,7,10,0.95)",
        boxShadow:
          "0 14px 30px " +
          (isSkip ? "rgba(255,77,77,0.12)" : "rgba(100,211,255,0.12)"),
        color: BRAND.text,
        cursor: "pointer",
        transition: "transform 0.12s, box-shadow 0.12s, opacity 0.15s",
        zIndex: target.contested ? 7 : 5,
        opacity: lifeRatio < 0.2 ? lifeRatio * 5 : 1,
      }}
    >
      {target.contested && (
        <span
          style={{
            position: "absolute",
            inset: -12,
            borderRadius: "50%",
            border: "2px solid rgba(255,94,94,0.55)",
            animation: "ringExpand 0.9s ease-out infinite",
          }}
        />
      )}
      <div
        style={{ display: "grid", gap: 6, textAlign: "center", width: "100%" }}
      >
        <AnimatedFigure isTech={!isSkip} color={color} age={target.age} />
        <span
          style={{
            fontFamily: "Archivo Black, sans-serif",
            fontSize: 13,
            letterSpacing: "0.2em",
            color: color,
          }}
        >
          {target.role}
        </span>
        <div style={{ fontSize: 11, lineHeight: 1.4, color: BRAND.muted }}>
          {isSkip ? "Vermijd — recruiter" : "Raak snel — tech talent"}
        </div>
        {target.flipped && (
          <span
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "#ffa36f" }}
          >
            TECH → HR
          </span>
        )}
        {/* life bar */}
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            marginTop: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 2,
              width: lifeRatio * 100 + "%",
              background: isSkip ? BRAND.negative : BRAND.highlight,
              transition: "width 0.15s linear",
            }}
          />
        </div>
      </div>
    </button>
  );
}

/* ── HUD with timer bar ── */
function HUD({ hits, goal, timeLeft, score, combo }) {
  const pct = Math.max(0, timeLeft / GAME_DURATION) * 100;
  const urgent = timeLeft < 6;
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 22,
          border: "1px solid " + BRAND.panelBorder,
          background: BRAND.panel,
          backdropFilter: "blur(14px)",
          color: BRAND.text,
        }}
      >
        {[
          { label: "Hits", value: hits + " / " + goal },
          {
            label: "Tijd",
            value: formatTimer(timeLeft),
            color: urgent ? BRAND.danger : undefined,
          },
          { label: "Score", value: score },
          {
            label: "Combo",
            value: combo > 1 ? combo + "x" : "—",
            color: combo > 2 ? BRAND.accent : undefined,
          },
        ].map(function (item) {
          return (
            <div key={item.label}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: BRAND.muted,
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 22,
                  fontFamily: "Archivo Black, sans-serif",
                  color: item.color || BRAND.text,
                }}
              >
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
      {/* timer bar */}
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            width: pct + "%",
            background: urgent
              ? "linear-gradient(90deg, " + BRAND.danger + ", #ff4d4d)"
              : "linear-gradient(90deg, " +
                BRAND.accent +
                ", " +
                BRAND.highlight +
                ")",
            transition: "width 0.3s linear",
            animation: urgent ? "pulseBar 0.5s ease-in-out infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}

/* ── Screens ── */
function StartScreen({ onStart }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(6,7,10,0.95)",
        padding: 32,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          borderRadius: 32,
          border: "1px solid " + BRAND.panelBorder,
          background: "rgba(15,17,18,0.98)",
          padding: 34,
          boxShadow: "0 36px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <img
            src={LOGO_SRC}
            alt="RecruitIn logo"
            width="52"
            height="52"
            style={{ borderRadius: 16, background: "#111" }}
          />
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: BRAND.accent,
                fontSize: 11,
              }}
            >
              Meta campagne game
            </p>
            <h1
              style={{
                margin: "10px 0 0",
                fontSize: 42,
                lineHeight: 1.05,
                fontFamily: "Archivo Black, sans-serif",
              }}
            >
              Score Vacature
            </h1>
          </div>
        </div>
        <p
          style={{
            margin: "0 0 24px",
            color: BRAND.muted,
            lineHeight: 1.9,
            fontSize: 16,
          }}
        >
          Raak 8 tech-talenten in 25 seconden. Maar pas op: een rode Pac-Man
          concurrent jaagt op dezelfde targets! Vermijd HR. Bouw combo's voor
          bonus punten. Win korting!
        </p>
        <div style={{ display: "grid", gap: 14, marginBottom: 26 }}>
          {[
            {
              label: "TECH = HIT",
              score: "+100",
              note: "snel — ze zijn zo weg",
              border: "rgba(100,211,255,0.12)",
            },
            {
              label: "HR = SKIP",
              score: "−50",
              note: "recruiters blijven hangen",
              border: "rgba(255,77,77,0.18)",
            },
            {
              label: "COMBO",
              score: "×2 ×3 ×4",
              note: "klik snel achter elkaar",
              border: "rgba(255,143,53,0.18)",
            },
            {
              label: "PAC-MAN",
              score: "concurrent",
              note: "eet jouw tech-talent op",
              border: "rgba(255,77,77,0.25)",
            },
          ].map(function (r) {
            return (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 16,
                  padding: 18,
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid " + r.border,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: BRAND.muted,
                    }}
                  >
                    {r.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 20,
                      fontFamily: "Archivo Black, sans-serif",
                    }}
                  >
                    {r.score}
                  </p>
                </div>
                <p style={{ margin: 0, color: BRAND.muted, fontSize: 12 }}>
                  {r.note}
                </p>
              </div>
            );
          })}
        </div>
        <button
          onClick={onStart}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 18,
            padding: "18px 22px",
            fontSize: 18,
            fontFamily: "Archivo Black, sans-serif",
            background: "linear-gradient(135deg, #ff8f35 0%, #ffbe59 100%)",
            color: "#111",
            cursor: "pointer",
          }}
        >
          Speel nu
        </button>
      </div>
    </div>
  );
}

function CountdownOverlay({ countdown }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(6,7,10,0.92)",
      }}
    >
      <div style={{ textAlign: "center", color: BRAND.text }}>
        <p
          style={{
            margin: "0 0 14px",
            color: BRAND.muted,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          Klaar voor de start?
        </p>
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 24px",
            backdropFilter: "blur(10px)",
            animation: "popIn 0.3s ease-out",
          }}
        >
          <span
            style={{ fontSize: 86, fontFamily: "Archivo Black, sans-serif" }}
          >
            {countdown > 0 ? countdown : "GO"}
          </span>
        </div>
        <p style={{ margin: 0, color: BRAND.muted }}>
          Raak zoveel mogelijk tech-vacatures binnen 25 seconden.
        </p>
      </div>
    </div>
  );
}

function WinScreen({ hits, score, onRetry }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async function () {
    if (!email || submitting) return;
    setSubmitting(true);
    trackEvent("Lead", { email: email });
    await new Promise(function (r) {
      setTimeout(r, 900);
    });
    setSubmitting(false);
    setSubmitted(true);
    trackEvent("DiscountClaimed", { code: DISCOUNT_CODE });
  };
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(6,7,10,0.96)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 32,
          border: "1px solid " + BRAND.panelBorder,
          background: "rgba(15,17,18,0.98)",
          padding: 32,
          boxShadow: "0 48px 110px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <img
            src={LOGO_SRC}
            alt="RecruitIn logo"
            width="48"
            height="48"
            style={{ borderRadius: 14, background: "#111" }}
          />
          <div>
            <p
              style={{
                margin: 0,
                color: BRAND.accent,
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Je hebt het gescoord
            </p>
            <h2
              style={{
                margin: "10px 0 0",
                fontSize: 34,
                lineHeight: 1.05,
                fontFamily: "Archivo Black, sans-serif",
              }}
            >
              Je vacature raakt.
            </h2>
          </div>
        </div>
        <p style={{ color: BRAND.muted, lineHeight: 1.8, marginBottom: 6 }}>
          Met {hits} hits en {score} punten heb je bewezen dat tech-talent
          scoren geen toeval is. Claim nu jouw kortingscode!
        </p>

        {/* Kortingscode blok — altijd zichtbaar als highlight */}
        <div
          style={{
            padding: 22,
            borderRadius: 22,
            marginBottom: 18,
            background:
              "linear-gradient(135deg, rgba(255,143,53,0.15), rgba(255,190,89,0.08))",
            border: "1px solid rgba(255,143,53,0.3)",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: BRAND.accent,
            }}
          >
            Jouw kortingscode
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 36,
              fontFamily: "Archivo Black, sans-serif",
              letterSpacing: "0.12em",
              color: BRAND.text,
            }}
          >
            {DISCOUNT_CODE}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: BRAND.muted }}>
            Vul je e-mail in om de code per mail te ontvangen + tips over
            recruitment marketing.
          </p>
        </div>

        <div style={{ display: "grid", gap: 14, marginBottom: 22 }}>
          <input
            value={email}
            onChange={function (e) {
              setEmail(e.target.value);
            }}
            placeholder="jouw@email.nl"
            type="email"
            style={{
              width: "100%",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: BRAND.text,
              padding: "16px 18px",
              fontSize: 15,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!email || submitting}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 18,
              padding: "18px 18px",
              fontSize: 17,
              fontFamily: "Archivo Black, sans-serif",
              background: "linear-gradient(135deg, #ffbe59 0%, #ff8f35 100%)",
              color: "#111",
              cursor: email ? "pointer" : "not-allowed",
              opacity: email ? 1 : 0.55,
            }}
          >
            {submitting ? "Verzenden..." : "Ontvang code per e-mail"}
          </button>
        </div>
        {submitted && (
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.2)",
              color: BRAND.success,
              marginBottom: 18,
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
              Check je inbox — code <strong>{DISCOUNT_CODE}</strong> is
              onderweg.
            </p>
          </div>
        )}
        <div style={{ display: "grid", gap: 14 }}>
          <a
            href="https://vacaturekanon.nl"
            target="_blank"
            rel="noopener noreferrer"
            onClick={function () {
              trackEvent("CTAClick", { label: "Vacaturekanon_Win" });
            }}
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              borderRadius: 18,
              border: "none",
              padding: "16px 18px",
              fontSize: 16,
              fontFamily: "Archivo Black, sans-serif",
              background: BRAND.accent,
              color: "#111",
              cursor: "pointer",
            }}
          >
            Bekijk Vacaturekanon.nl
          </a>
          <button
            onClick={function () {
              onRetry();
              trackEvent("CTAClick", { label: "Retry" });
            }}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: BRAND.text,
              padding: "14px 18px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Speel nog een keer
          </button>
        </div>
      </div>
    </div>
  );
}

function LoseScreen({ onRetry }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "grid",
        placeItems: "center",
        background: "rgba(6,7,10,0.96)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          borderRadius: 32,
          border: "1px solid " + BRAND.panelBorder,
          background: "rgba(15,17,18,0.98)",
          padding: 34,
          boxShadow: "0 46px 110px rgba(0,0,0,0.4)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: BRAND.accent,
            textTransform: "uppercase",
            letterSpacing: "0.24em",
            fontSize: 11,
          }}
        >
          Niet gehaald
        </p>
        <h2
          style={{
            margin: "16px 0 0",
            fontSize: 42,
            lineHeight: 1.05,
            fontFamily: "Archivo Black, sans-serif",
          }}
        >
          Tech vacatures scoren is precies zo — moeilijk, tot je ze met ons
          afvuurt.
        </h2>
        <p style={{ margin: "22px 0 0", color: BRAND.muted, lineHeight: 1.8 }}>
          8 hits in 25 seconden is geen cadeautje. Wij schieten dagelijks
          vacatures raak voor onze klanten.
        </p>
        <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
          <a
            href="https://vacaturekanon.nl"
            target="_blank"
            rel="noopener noreferrer"
            onClick={function () {
              trackEvent("CTAClick", { label: "Vacaturekanon_Lose" });
            }}
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              border: "none",
              borderRadius: 18,
              padding: "18px 22px",
              fontSize: 17,
              fontFamily: "Archivo Black, sans-serif",
              background: "linear-gradient(135deg, #ff8f35 0%, #ffbe59 100%)",
              color: "#111",
              cursor: "pointer",
            }}
          >
            Bekijk Vacaturekanon.nl
          </a>
          <button
            onClick={function () {
              onRetry();
              trackEvent("CTAClick", { label: "Retry" });
            }}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 18,
              padding: "16px 22px",
              fontSize: 15,
              background: "rgba(255,255,255,0.04)",
              color: BRAND.text,
              cursor: "pointer",
            }}
          >
            Probeer opnieuw
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── GameField with particles, popups & screen shake ── */
function GameField({ isPlaying, onTimeUpdate, onTargetHit, onTargetMiss }) {
  const [targets, setTargets] = useState([]);
  const [particles, setParticles] = useState([]);
  const [popups, setPopups] = useState([]);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [pacman, setPacman] = useState({ x: 50, y: 50, dx: 1, age: 0 });
  const stateRef = useRef({ lastTime: 0, elapsed: 0, acc: 0, nextId: 1 });
  const pacRef = useRef({ x: 50, y: 50, dx: 1, targetId: null });
  const frameRef = useRef(null);
  const particleBaseRef = useRef({});

  var spawnInterval = function (t) {
    return Math.max(0.45, 1.0 - t * 0.022);
  };
  var skipBias = function (t) {
    return 0.45 + Math.min(0.25, t / 80);
  };

  var createTarget = function (elapsed) {
    var role = Math.random() < skipBias(elapsed) ? "HR" : "TECH";
    var lifetime =
      role === "TECH"
        ? 1.0 + randomBetween(0, 0.6)
        : 1.6 + randomBetween(0, 0.8);
    var flipAt =
      role === "TECH" && Math.random() < 0.1
        ? lifetime * randomBetween(0.45, 0.55)
        : null;
    var contested = role === "TECH" && Math.random() < 0.15;
    return {
      id: stateRef.current.nextId++,
      role: role,
      lifetime: lifetime,
      age: 0,
      flipAt: flipAt,
      flipped: false,
      contested: contested,
      contestedDuration: 0.6,
      x: randomBetween(14, 86),
      y: randomBetween(18, 76),
      vx: role === "TECH" ? randomBetween(-6, 6) : 0,
      vy: role === "TECH" ? randomBetween(-4, 4) : 0,
    };
  };

  var spawnParticles = function (x, y, color, count) {
    count = count || 8;
    var now = performance.now();
    var ps = [];
    for (var i = 0; i < count; i++) {
      ps.push({
        id: uid(),
        baseX: x,
        baseY: y,
        vx: randomBetween(-120, 120),
        vy: randomBetween(-160, 40),
        size: randomBetween(3, 7),
        color: color,
        life: randomBetween(0.3, 0.6),
        born: now,
        opacity: 1,
        x: x + "%",
        y: y + "%",
      });
    }
    setParticles(function (prev) {
      return prev.concat(ps);
    });
  };

  var spawnPopup = function (x, y, text, color, combo) {
    combo = combo || 1;
    setPopups(function (prev) {
      return prev.concat([
        {
          id: uid(),
          baseX: x,
          baseY: y,
          x: x + "%",
          y: y + "%",
          text: text,
          color: color,
          vy: -80,
          life: 0.7,
          born: performance.now(),
          opacity: 1,
          combo: combo,
        },
      ]);
    });
  };

  var doShake = function (intensity) {
    intensity = intensity || 4;
    setShake({
      x: randomBetween(-intensity, intensity),
      y: randomBetween(-intensity, intensity),
    });
    setTimeout(function () {
      setShake({ x: 0, y: 0 });
    }, 80);
  };

  useEffect(
    function () {
      if (!isPlaying) {
        setTargets([]);
        setParticles([]);
        setPopups([]);
        pacRef.current = {
          x: randomBetween(10, 90),
          y: randomBetween(20, 80),
          dx: 1,
          targetId: null,
          chompCd: 0,
        };
        setPacman({ x: pacRef.current.x, y: pacRef.current.y, dx: 1, age: 0 });
        return;
      }
      stateRef.current = {
        lastTime: performance.now(),
        elapsed: 0,
        acc: 0,
        nextId: 1,
      };
      setTargets([]);
      setParticles([]);
      setPopups([]);
      pacRef.current = {
        x: randomBetween(10, 90),
        y: randomBetween(20, 80),
        dx: 1,
        targetId: null,
        chompCd: 0,
      };

      var PAC_SPEED = 18; // % per second

      var step = function (now) {
        var s = stateRef.current;
        var dt = Math.min(0.05, (now - s.lastTime) / 1000);
        s.lastTime = now;
        s.elapsed += dt;
        s.acc += dt;
        var interval = spawnInterval(s.elapsed);
        var spawns = Math.floor(s.acc / interval);
        if (spawns > 0) s.acc -= spawns * interval;

        // Pac-Man speed ramps up over time
        var pacSpeed = PAC_SPEED + s.elapsed * 0.3;
        var pac = pacRef.current;
        pac.chompCd = Math.max(0, pac.chompCd - dt);

        setTargets(function (prev) {
          var next = [];
          var eaten = null;
          for (var i = 0; i < prev.length; i++) {
            var t = prev[i];
            var u = Object.assign({}, t, { age: t.age + dt });
            if (u.role === "TECH" && !u.flipped) {
              u.x = clamp(u.x + u.vx * dt, 12, 88);
              u.y = clamp(u.y + u.vy * dt, 16, 78);
              if (u.flipAt && u.age >= u.flipAt) u.flipped = true;
            }
            if (u.contested && !u.flipped && u.age >= u.contestedDuration)
              continue;
            if (u.age >= u.lifetime) continue;
            next.push(u);
          }
          for (var j = 0; j < spawns; j++) next.push(createTarget(s.elapsed));

          // Pac-Man AI: find nearest TECH target
          var nearest = null;
          var nearDist = Infinity;
          for (var k = 0; k < next.length; k++) {
            if (next[k].role === "TECH" && !next[k].flipped) {
              var ddx = next[k].x - pac.x;
              var ddy = next[k].y - pac.y;
              var dist = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dist < nearDist) {
                nearDist = dist;
                nearest = next[k];
              }
            }
          }

          // Move pac-man toward nearest TECH
          if (nearest) {
            var mx = nearest.x - pac.x;
            var my = nearest.y - pac.y;
            var ml = Math.sqrt(mx * mx + my * my) || 1;
            pac.x = clamp(pac.x + (mx / ml) * pacSpeed * dt, 4, 96);
            pac.y = clamp(pac.y + (my / ml) * pacSpeed * dt, 8, 92);
            pac.dx = mx >= 0 ? 1 : -1;

            // Check collision: eat TECH target
            if (nearDist < 5 && pac.chompCd <= 0) {
              eaten = nearest;
              pac.chompCd = 0.4;
              next = next.filter(function (t) {
                return t.id !== nearest.id;
              });
            }
          } else {
            // Wander randomly when no targets
            pac.x = clamp(pac.x + pac.dx * pacSpeed * 0.5 * dt, 8, 92);
            if (pac.x <= 8 || pac.x >= 92) pac.dx = -pac.dx;
          }

          // Side-effects for eating (queued via setTimeout to avoid setState-in-setState)
          if (eaten) {
            setTimeout(function () {
              sfx.chomp();
              spawnParticles(eaten.x, eaten.y, BRAND.negative, 8);
              spawnPopup(eaten.x, eaten.y, "OPGEGETEN!", BRAND.negative);
              doShake(4);
            }, 0);
          }

          return next;
        });

        // Update pac-man render state
        setPacman({ x: pac.x, y: pac.y, dx: pac.dx, age: s.elapsed });

        // update particles
        setParticles(function (prev) {
          var out = [];
          for (var i = 0; i < prev.length; i++) {
            var p = prev[i];
            var age = (now - p.born) / 1000;
            if (age >= p.life) continue;
            var ratio = 1 - age / p.life;
            out.push(
              Object.assign({}, p, {
                x: "calc(" + p.baseX + "% + " + p.vx * age + "px)",
                y: "calc(" + p.baseY + "% + " + p.vy * age + "px)",
                opacity: ratio,
                size: p.size * ratio,
              }),
            );
          }
          return out;
        });

        // update popups
        setPopups(function (prev) {
          var out = [];
          for (var i = 0; i < prev.length; i++) {
            var p = prev[i];
            var age = (now - p.born) / 1000;
            if (age >= p.life) continue;
            out.push(
              Object.assign({}, p, {
                y: "calc(" + p.baseY + "% + " + p.vy * age + "px)",
                opacity: 1 - age / p.life,
              }),
            );
          }
          return out;
        });

        onTimeUpdate(s.elapsed);
        frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
      return function () {
        cancelAnimationFrame(frameRef.current);
      };
    },
    [isPlaying],
  );

  var handleClick = useCallback(
    function (id) {
      setTargets(function (prev) {
        var t = null;
        for (var i = 0; i < prev.length; i++) {
          if (prev[i].id === id) {
            t = prev[i];
            break;
          }
        }
        if (!t) return prev;
        var isHit = t.role === "TECH" && !t.flipped;
        if (isHit) {
          spawnParticles(t.x, t.y, BRAND.highlight, 10);
          onTargetHit(t.x, t.y);
          doShake(3);
        } else {
          spawnParticles(t.x, t.y, BRAND.negative, 6);
          onTargetMiss(t.x, t.y);
          doShake(6);
        }
        return prev.filter(function (i) {
          return i.id !== id;
        });
      });
    },
    [onTargetHit, onTargetMiss],
  );

  return (
    <div
      style={{
        position: "relative",
        minHeight: 520,
        borderRadius: 28,
        border: "1px solid " + BRAND.panelBorder,
        background:
          "radial-gradient(circle at top, rgba(100,211,255,0.06), transparent 42%), rgba(13,15,18,0.96)",
        overflow: "hidden",
        padding: 16,
        transform: "translate(" + shake.x + "px," + shake.y + "px)",
        transition: "transform 0.06s ease-out",
      }}
    >
      {/* field decorations */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "18%",
            width: 250,
            height: 250,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            border: "1px solid rgba(100,211,255,0.08)",
          }}
        />
      </div>
      {targets.map(function (t) {
        return <TargetCard key={t.id} target={t} onClick={handleClick} />;
      })}
      {isPlaying && <PacManSprite pacman={pacman} />}
      {particles.map(function (p) {
        return <Particle key={p.id} p={p} />;
      })}
      {popups.map(function (p) {
        return <ScorePopup key={p.id} popup={p} />;
      })}
    </div>
  );
}

/* ── Main Game ── */
function Game() {
  var _s = useState("start"),
    screen = _s[0],
    setScreen = _s[1];
  var _c = useState(3),
    countdown = _c[0],
    setCountdown = _c[1];
  var _e = useState(0),
    elapsed = _e[0],
    setElapsed = _e[1];
  var _h = useState(0),
    hits = _h[0],
    setHits = _h[1];
  var _sc = useState(0),
    score = _sc[0],
    setScore = _sc[1];
  var _co = useState(0),
    combo = _co[0],
    setCombo = _co[1];
  var comboTimer = useRef(null);

  var resetCombo = function () {
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(function () {
      setCombo(0);
    }, 1200);
  };

  useEffect(
    function () {
      if (screen === "playing" && hits >= WIN_HITS) {
        setScreen("win");
        sfx.win();
        trackEvent("GameWon", {
          hits: hits,
          score: score,
          timeLeft: Math.max(0, GAME_DURATION - elapsed),
        });
      }
    },
    [hits, screen],
  );

  useEffect(
    function () {
      if (screen === "playing" && elapsed >= GAME_DURATION) {
        setScreen("lose");
        sfx.lose();
        trackEvent("GameLost", { hits: hits, score: score, timeLeft: 0 });
      }
    },
    [elapsed, screen],
  );

  useEffect(
    function () {
      if (screen === "countdown") {
        sfx.tick();
        var t = setInterval(function () {
          setCountdown(function (p) {
            return p - 1;
          });
        }, 1000);
        return function () {
          clearInterval(t);
        };
      }
    },
    [screen],
  );

  useEffect(
    function () {
      if (screen === "countdown" && countdown <= 0) {
        sfx.start();
        setScreen("playing");
        setCountdown(3);
      }
    },
    [countdown, screen],
  );

  var handleStart = function () {
    setHits(0);
    setScore(0);
    setElapsed(0);
    setCombo(0);
    setScreen("countdown");
    trackEvent("GameStart", { variant: "Score Vacature" });
  };

  var handleRetry = function () {
    setHits(0);
    setScore(0);
    setElapsed(0);
    setCombo(0);
    setScreen("start");
  };

  var handleHit = useCallback(function (x, y) {
    setCombo(function (prev) {
      var next = prev + 1;
      var multiplier = Math.min(4, next);
      var points = HIT_SCORE * multiplier;
      setScore(function (s) {
        return s + points;
      });
      setHits(function (h) {
        return h + 1;
      });
      if (next > 2) sfx.combo();
      else sfx.hit();
      if (navigator.vibrate) navigator.vibrate([18, 8, 18]);
      resetCombo();
      return next;
    });
  }, []);

  var handleMiss = useCallback(function (x, y) {
    setScore(function (s) {
      return s - MISS_PENALTY;
    });
    setCombo(0);
    sfx.miss();
    if (navigator.vibrate) navigator.vibrate([8]);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        padding: 26,
        display: "grid",
        gap: 18,
        alignContent: "start",
      }}
    >
      <BlueprintBg />
      <div
        style={{
          display: "grid",
          gap: 10,
          maxWidth: 1120,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: BRAND.accent,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontSize: 12,
              }}
            >
              Score Vacature
            </p>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: 40,
                lineHeight: 1.05,
                fontFamily: "Archivo Black, sans-serif",
              }}
            >
              Schiet jij je vacature raak?
            </h1>
          </div>
        </div>

        <HUD
          hits={hits}
          goal={WIN_HITS}
          timeLeft={Math.max(0, GAME_DURATION - elapsed)}
          score={score}
          combo={combo}
        />
        <GameField
          isPlaying={screen === "playing"}
          onTimeUpdate={setElapsed}
          onTargetHit={handleHit}
          onTargetMiss={handleMiss}
        />
      </div>

      {screen === "start" && <StartScreen onStart={handleStart} />}
      {screen === "countdown" && <CountdownOverlay countdown={countdown} />}
      {screen === "win" && (
        <WinScreen hits={hits} score={score} onRetry={handleRetry} />
      )}
      {screen === "lose" && <LoseScreen onRetry={handleRetry} />}
    </div>
  );
}

var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Game />);
