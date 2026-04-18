const { useState, useEffect, useRef, useMemo } = React;

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

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatTimer = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${s}s`;
};

const trackEvent = (eventName, payload = {}) => {
  console.log("[FB Pixel Event]", eventName, payload);
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, payload);
  }
};

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
            "radial-gradient(circle at top left, rgba(255, 140, 34, 0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.18), transparent 26%)",
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

function CrosshairCursor() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 44,
        height: 44,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 2,
          height: 20,
          background: "rgba(255,255,255,0.75)",
          transform: "translateX(-50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 20,
          height: 2,
          background: "rgba(255,255,255,0.75)",
          transform: "translateY(-50%)",
        }}
      />
    </div>
  );
}

function TargetCard({ target, onClick }) {
  const isActiveTech = target.role === "TECH" && !target.flipped;
  const isSkip = target.role === "HR" || target.flipped;
  const cardColor = isSkip ? "#ff4d4d" : "#64d3ff";
  const label = target.role;

  const cardStyles = {
    position: "absolute",
    left: `${target.x}%`,
    top: `${target.y}%`,
    transform: "translate(-50%, -50%)",
    width: 118,
    minWidth: 118,
    padding: "16px 18px",
    borderRadius: 20,
    border: `2px solid ${isSkip ? "rgba(255,77,77,0.3)" : "rgba(100,211,255,0.35)"}`,
    background: "rgba(6,7,10,0.95)",
    boxShadow: `0 18px 40px ${isSkip ? "rgba(255,77,77,0.12)" : "rgba(100,211,255,0.12)"}`,
    color: BRAND.text,
    cursor: "pointer",
    transition: "transform 0.14s ease, box-shadow 0.14s ease",
    zIndex: target.contested ? 7 : 5,
    animation: isActiveTech ? "float 2s ease-in-out infinite" : isSkip ? "pulse 1.5s ease-in-out infinite" : "none",
  };

  const ring = target.contested ? (
    <span
      style={{
        position: "absolute",
        inset: -12,
        borderRadius: "50%",
        border: `2px solid rgba(255, 94, 94, 0.55)`,
        animation: "ringExpand 0.9s ease-out infinite",
        opacity: 0.9,
      }}
    />
  ) : null;

  const flippedBadge = target.flipped ? (
    <span
      style={{
        marginTop: 8,
        display: "inline-flex",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: "#ffa36f",
        opacity: 0.95,
      }}
    >
      TECH → HR
    </span>
  ) : null;

  // Animated figure component
  const AnimatedFigure = ({ isTech, color }) => (
    <div style={{
      width: 32,
      height: 32,
      position: "relative",
      margin: "0 auto 8px",
    }}>
      {/* Head */}
      <div style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: color,
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        boxShadow: `0 0 8px ${color}40`,
        animation: isTech ? "bounce 1s ease-in-out infinite" : "none",
      }} />

      {/* Body */}
      <div style={{
        width: 8,
        height: 14,
        background: color,
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: "4px 4px 2px 2px",
        opacity: 0.9,
      }} />

      {/* Arms */}
      <div style={{
        width: 16,
        height: 3,
        background: color,
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: "2px",
        opacity: 0.8,
        animation: isTech ? "wave 1.2s ease-in-out infinite" : "none",
      }} />

      {/* Legs */}
      <div style={{
        width: 3,
        height: 6,
        background: color,
        position: "absolute",
        top: 22,
        left: 10,
        borderRadius: "2px",
        opacity: 0.7,
        animation: isTech ? "walk 0.8s ease-in-out infinite" : "none",
      }} />
      <div style={{
        width: 3,
        height: 6,
        background: color,
        position: "absolute",
        top: 22,
        right: 10,
        borderRadius: "2px",
        opacity: 0.7,
        animation: isTech ? "walk 0.8s ease-in-out infinite reverse" : "none",
      }} />
    </div>
  );

  return (
    <button type="button" onClick={() => onClick(target.id)} style={cardStyles}>
      {ring}
      <div
        style={{ display: "grid", gap: 8, textAlign: "center", width: "100%" }}
      >
        <AnimatedFigure isTech={isActiveTech} color={cardColor} />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Archivo Black, sans-serif",
              fontSize: 12,
              letterSpacing: "0.24em",
              color: cardColor,
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: BRAND.muted }}>
          {target.role === "TECH" && target.flipped
            ? "Flipped midway → vermijd deze tech"
            : target.role === "HR"
              ? "Recruiter / HR — niet raken"
              : "Tech talent — raak snel"}
        </div>
        {flippedBadge}
        <div style={{ fontSize: 10, color: BRAND.muted }}>
          {target.contested
            ? "Concurrentie binnen 0.6s"
            : `Verdwijnt in ${Math.max(0, Math.ceil(target.lifetime - target.age))}s`}
        </div>
      </div>
    </button>
  );
}

function HUD({ hits, goal, timeLeft, score }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
        padding: "18px 20px",
        borderRadius: 24,
        border: `1px solid ${BRAND.panelBorder}`,
        background: BRAND.panel,
        backdropFilter: "blur(14px)",
        color: BRAND.text,
        marginBottom: 18,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: BRAND.muted,
          }}
        >
          Hits
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 24,
            fontFamily: "Archivo Black, sans-serif",
          }}
        >
          {hits} / {goal}
        </p>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: BRAND.muted,
          }}
        >
          Tijd
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 24,
            fontFamily: "Archivo Black, sans-serif",
          }}
        >
          {formatTimer(timeLeft)}
        </p>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: BRAND.muted,
          }}
        >
          Score
        </p>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 24,
            fontFamily: "Archivo Black, sans-serif",
          }}
        >
          {score}
        </p>
      </div>
    </div>
  );
}

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
          border: `1px solid ${BRAND.panelBorder}`,
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
          Raak 8 tech-talenten in 25 seconden. Ze bewegen. Concurrenten azen
          mee. Vermijd HR. Win korting.
        </p>
        <div style={{ display: "grid", gap: 14, marginBottom: 26 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              padding: 18,
              borderRadius: 20,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(100,211,255,0.12)`,
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
                TECH = HIT
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 20,
                  fontFamily: "Archivo Black, sans-serif",
                }}
              >
                +100
              </p>
            </div>
            <p style={{ margin: 0, color: BRAND.muted, fontSize: 12 }}>
              snel — ze zijn zo weg
            </p>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              padding: 18,
              borderRadius: 20,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,77,77,0.18)`,
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
                HR = SKIP
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 20,
                  fontFamily: "Archivo Black, sans-serif",
                }}
              >
                −50
              </p>
            </div>
            <p style={{ margin: 0, color: BRAND.muted, fontSize: 12 }}>
              recruiters blijven hangen
            </p>
          </div>
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
            margin: 0,
            marginBottom: 14,
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
            border: `1px solid rgba(255,255,255,0.1)`,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 24px",
            backdropFilter: "blur(10px)",
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

function WinScreen({ hits, timeLeft, onRetry, onClaim }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email || submitting) return;
    setSubmitting(true);
    trackEvent("Lead", { email });
    await new Promise((r) => setTimeout(r, 900));
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
          border: `1px solid ${BRAND.panelBorder}`,
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
        <p style={{ color: BRAND.muted, lineHeight: 1.8, marginBottom: 22 }}>
          Met {hits} hits in {Math.ceil(timeLeft)} seconden heb je laten zien
          dat het scoren van tech-talent geen makkelijke prooi is. Vul je e-mail
          in en claim de code.
        </p>
        <div style={{ display: "grid", gap: 14, marginBottom: 28 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
            style={{
              width: "100%",
              borderRadius: 16,
              border: `1px solid rgba(255,255,255,0.12)`,
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
              padding: "16px 18px",
              fontSize: 17,
              fontFamily: "Archivo Black, sans-serif",
              background: "linear-gradient(135deg, #ffbe59 0%, #ff8f35 100%)",
              color: "#111",
              cursor: email ? "pointer" : "not-allowed",
              opacity: email ? 1 : 0.55,
            }}
          >
            Claim korting
          </button>
        </div>
        {submitted ? (
          <div
            style={{
              padding: 18,
              borderRadius: 20,
              background: "rgba(74, 222, 128, 0.12)",
              border: "1px solid rgba(74, 222, 128, 0.2)",
              color: BRAND.success,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              Top! Je korting is onderweg. Gebruik de code{" "}
              <strong>{DISCOUNT_CODE}</strong> in de campagneflow.
            </p>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            marginTop: 28,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              onRetry();
              trackEvent("CTAClick", { label: "Speel opnieuw" });
            }}
            style={{
              flex: 1,
              minWidth: 160,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: BRAND.text,
              padding: "16px 18px",
              cursor: "pointer",
            }}
          >
            Speel nog een keer
          </button>
          <button
            onClick={() => {
              onRetry();
              trackEvent("CTAClick", { label: "Terug naar start" });
            }}
            style={{
              flex: 1,
              minWidth: 160,
              borderRadius: 18,
              border: "none",
              background: BRAND.accent,
              color: "#111",
              padding: "16px 18px",
              cursor: "pointer",
            }}
          >
            Terug naar start
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
          border: `1px solid ${BRAND.panelBorder}`,
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
          Je bent er dichtbij geweest, maar 8 hits in 25 seconden is geen
          cadeautje. Probeer het nog eens en benut de concurrentie om je
          voordeel te doen.
        </p>
        <button
          onClick={() => {
            onRetry();
            trackEvent("CTAClick", { label: "Retry" });
          }}
          style={{
            marginTop: 28,
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
          Opnieuw
        </button>
      </div>
    </div>
  );
}

function TweaksPanel({ hapticEnabled, setHapticEnabled }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 22,
        border: `1px solid ${BRAND.panelBorder}`,
        background: "rgba(15,17,18,0.92)",
        color: BRAND.text,
        display: "grid",
        gap: 12,
        marginTop: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: BRAND.muted,
            }}
          >
            Game tweaks
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: BRAND.text }}>
            Kleine instellingen voor demo en analytics.
          </p>
        </div>
        <div style={{ display: "grid", gap: 8, minWidth: 140 }}>
          <button
            type="button"
            onClick={() => setHapticEnabled((v) => !v)}
            style={{
              width: "100%",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "10px",
              color: BRAND.text,
              background: hapticEnabled
                ? "rgba(100,211,255,0.14)"
                : "rgba(255,255,255,0.04)",
              cursor: "pointer",
            }}
          >
            {hapticEnabled ? "Haptics aan" : "Haptics uit"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: BRAND.muted, lineHeight: 1.7 }}>
        Discount code en pixel hooks zijn bovenaan `game.jsx` gedefinieerd. De
        game logica blijft visueel identiek aan het prototype, maar is pittiger
        en rijper voor campagnegebruik.
      </div>
    </div>
  );
}

function GameField({ isPlaying, onTimeUpdate, onTargetHit, onTargetSkip }) {
  const [targets, setTargets] = useState([]);
  const stateRef = useRef({
    lastTime: performance.now(),
    elapsed: 0,
    accumulator: 0,
    nextId: 1,
  });
  const frameRef = useRef(null);
  const fieldRef = useRef(null);

  const spawnInterval = (elapsed) => Math.max(0.45, 1.0 - elapsed * 0.022);
  const skipBias = (elapsed) => 0.45 + Math.min(0.25, elapsed / 80);

  const createTarget = (elapsed) => {
    const role = Math.random() < skipBias(elapsed) ? "HR" : "TECH";
    const lifetime =
      role === "TECH"
        ? 1.0 + randomBetween(0, 0.6)
        : 1.6 + randomBetween(0, 0.8);
    const flipAt =
      role === "TECH" && Math.random() < 0.1
        ? lifetime * randomBetween(0.45, 0.55)
        : null;
    const contested = role === "TECH" && Math.random() < 0.15;
    const x = randomBetween(14, 86);
    const y = randomBetween(18, 76);
    const vx = role === "TECH" ? randomBetween(-6, 6) : 0;
    const vy = role === "TECH" ? randomBetween(-4, 4) : 0;

    return {
      id: stateRef.current.nextId,
      role,
      x,
      y,
      vx,
      vy,
      lifetime,
      age: 0,
      flipAt,
      flipped: false,
      contested,
      contestedDuration: 0.6,
    };
  };

  useEffect(() => {
    if (!isPlaying) {
      setTargets([]);
      return;
    }

    stateRef.current = {
      lastTime: performance.now(),
      elapsed: 0,
      accumulator: 0,
      nextId: 1,
    };
    setTargets([]);

    const step = (now) => {
      const state = stateRef.current;
      const dt = Math.min(0.05, (now - state.lastTime) / 1000);
      state.lastTime = now;
      state.elapsed += dt;
      state.accumulator += dt;
      const interval = spawnInterval(state.elapsed);
      const spawnCount = Math.floor(state.accumulator / interval);
      if (spawnCount > 0) {
        state.accumulator -= spawnCount * interval;
      }

      setTargets((prev) => {
        const nextTargets = [];
        for (const target of prev) {
          let updated = { ...target, age: target.age + dt };
          if (updated.role === "TECH" && !updated.flipped) {
            updated.x = clamp(updated.x + updated.vx * dt, 12, 88);
            updated.y = clamp(updated.y + updated.vy * dt, 16, 78);
            if (updated.flipAt && updated.age >= updated.flipAt) {
              updated = { ...updated, flipped: true };
            }
          }

          const expiredByContest =
            updated.contested &&
            !updated.flipped &&
            updated.age >= updated.contestedDuration;
          if (expiredByContest) {
            continue;
          }
          if (updated.age >= updated.lifetime) {
            continue;
          }
          nextTargets.push(updated);
        }

        for (let i = 0; i < spawnCount; i += 1) {
          const next = createTarget(state.elapsed);
          next.id = state.nextId;
          state.nextId += 1;
          nextTargets.push(next);
        }

        return nextTargets;
      });

      onTimeUpdate(state.elapsed);
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying]);

  const handleClick = (id) => {
    setTargets((prev) => {
      const clicked = prev.find((item) => item.id === id);
      if (!clicked) return prev;
      const isHit = clicked.role === "TECH" && !clicked.flipped;
      if (isHit) {
        onTargetHit();
      } else {
        onTargetSkip();
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  return (
    <div
      ref={fieldRef}
      style={{
        position: "relative",
        minHeight: 520,
        borderRadius: 28,
        border: `1px solid ${BRAND.panelBorder}`,
        background:
          "radial-gradient(circle at top, rgba(100,211,255,0.06), transparent 42%), rgba(13,15,18,0.96)",
        overflow: "hidden",
        padding: 16,
      }}
    >
      <CrosshairCursor />
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
      {targets.map((target) => (
        <TargetCard key={target.id} target={target} onClick={handleClick} />
      ))}
    </div>
  );
}

function Game() {
  const [screen, setScreen] = useState("start");
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [hits, setHits] = useState(0);
  const [skips, setSkips] = useState(0);
  const [score, setScore] = useState(0);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    if (screen !== "playing") return;
    if (hits >= WIN_HITS) {
      setScreen("win");
      trackEvent("GameWon", {
        hits,
        timeLeft: Math.max(0, GAME_DURATION - elapsed),
      });
    }
  }, [hits, screen, elapsed]);

  useEffect(() => {
    if (screen !== "playing") return;
    if (elapsed >= GAME_DURATION) {
      setScreen("lose");
      trackEvent("GameLost", { hits, timeLeft: 0 });
    }
  }, [elapsed, screen, hits]);

  useEffect(() => {
    let timer;
    if (screen === "countdown") {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [screen]);

  useEffect(() => {
    if (screen === "countdown" && countdown <= 0) {
      setScreen("playing");
      setCountdown(3);
    }
  }, [countdown, screen]);

  const handleStart = () => {
    setHits(0);
    setSkips(0);
    setScore(0);
    setElapsed(0);
    setScreen("countdown");
    trackEvent("GameStart", { variant: "Score Vacature" });
  };

  const handleRetry = () => {
    setHits(0);
    setSkips(0);
    setScore(0);
    setElapsed(0);
    setScreen("start");
  };

  const handleTargetHit = () => {
    setHits((prev) => prev + 1);
    setScore((prev) => prev + HIT_SCORE);
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([18, 8, 18]);
    }
  };

  const handleTargetSkip = () => {
    setSkips((prev) => prev + 1);
    setScore((prev) => prev - MISS_PENALTY);
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([8]);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100%",
        padding: 26,
        display: "grid",
        gap: 22,
        alignContent: "start",
      }}
    >
      <BlueprintBg />
      <div
        style={{
          display: "grid",
          gap: 14,
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
          <div style={{ display: "grid", gap: 10, justifyContent: "end" }}>
            <p style={{ margin: 0, color: BRAND.muted, fontSize: 14 }}>
              Meta-campagne lead-gen game met realistische speelbalans.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  padding: "10px 14px",
                  borderRadius: 18,
                }}
              >
                <strong style={{ color: BRAND.text }}>Pixel ID:</strong>{" "}
                <span style={{ color: BRAND.muted }}>{FACEBOOK_PIXEL_ID}</span>
              </span>
            </div>
          </div>
        </div>

        <HUD
          hits={hits}
          goal={WIN_HITS}
          timeLeft={Math.max(0, GAME_DURATION - elapsed)}
          score={score}
        />
        <GameField
          isPlaying={screen === "playing"}
          onTimeUpdate={setElapsed}
          onTargetHit={handleTargetHit}
          onTargetSkip={handleTargetSkip}
        />
        <TweaksPanel
          hapticEnabled={hapticEnabled}
          setHapticEnabled={setHapticEnabled}
        />
      </div>

      {screen === "start" && <StartScreen onStart={handleStart} />}
      {screen === "countdown" && <CountdownOverlay countdown={countdown} />}
      {screen === "win" && (
        <WinScreen
          hits={hits}
          timeLeft={Math.max(0, GAME_DURATION - elapsed)}
          onRetry={handleRetry}
          onClaim={() => {}}
        />
      )}
      {screen === "lose" && <LoseScreen onRetry={handleRetry} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Game />);
