import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Coffee,
  Flower2,
  Heart,
  Mail,
  Sprout,
  Gift as GiftIcon,
} from "lucide-react";
import { MotionConfig, motion } from "framer-motion";

import type { Session } from "@supabase/supabase-js";
import { Bouquet, Flower, GardenArt } from "./art";
import {
  arrangements,
  colors,
  db,
  empty,
  flowers,
  folds,
  fonts,
  publishSchema,
  ribbons,
  shareUrl,
  themes,
  wraps,
  type Gift,
  type GiftRow,
} from "./model";
import { Keepsake } from "./keepsake";
import "./style.css";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!db);
  useEffect(() => {
    if (!db) return;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_, next) => {
      setSession(next);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <header className="header">
          <Link className="brand" to="/">
            <Flower2 size={25} /> Bloom &amp; Letter
          </Link>
          <nav aria-label="Main">
            <Link to="/">Home</Link>
            <a href="/#how">How It Works</a>
            <Link className="nav-create" to="/create">
              Create a Bouquet
            </Link>
            <Link to={session ? "/letters" : "/account"}>
              {session ? "My Letters" : "Sign In"}
            </Link>
          </nav>
          <Link className="button small" to="/create">
            Create Your Gift
          </Link>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/create/:id?"
            element={<EditorRoute session={session} ready={ready} />}
          />
          <Route path="/gift/:token" element={<Recipient />} />
          <Route path="/account" element={<Account session={session} />} />
          <Route
            path="/letters"
            element={<Dashboard session={session} ready={ready} />}
          />
          <Route path="/support" element={<Support />} />
          <Route
            path="/privacy"
            element={
              <main className="page narrow">
                <h1>Privacy</h1>
                <p>
                  Your drafts are tied to your account. Published gifts can be
                  read by anyone with their sharing link while it is active. You
                  can revoke a link or delete the gift from My Letters.
                </p>
              </main>
            }
          />
          <Route
            path="*"
            element={
              <main className="page narrow">
                <h1>Page not found</h1>
                <Link to="/">Return home</Link>
              </main>
            }
          />
        </Routes>
        <footer>
          <Link className="brand" to="/">
            <Flower2 /> Bloom &amp; Letter
          </Link>
          <span>Flowers for the feelings you put into words.</span>
          <Link to="/support">
            <Coffee size={16} /> Buy Me a Coffee
          </Link>
          <Link to="/privacy">Privacy</Link>
        </footer>
      </BrowserRouter>
    </MotionConfig>
  );
}

function Home() {
  return (
    <main>
      <section className="hero page">
        <div>
          <p className="eyebrow">
            <Sprout size={17} /> A little garden for big feelings
          </p>
          <h1>
            Some feelings deserve more than <em>just words.</em>
          </h1>
          <p className="intro">
            Pick the flowers, write the words, and send someone a little piece
            of your heart.
          </p>
          <div className="actions">
            <Link className="button" to="/create">
              <Flower2 size={19} /> Create Your Bouquet
            </Link>
            <a className="text-link" href="#how">
              Discover How It Works
            </a>
          </div>
        </div>
        <GardenArt />
      </section>
      <section id="how" className="how">
        <div className="page">
          <p className="eyebrow">From garden to doorstep</p>
          <h2>A gift made by you</h2>
          <div className="how-grid">
            {[
              [
                Sprout,
                "Pick your flowers",
                "Find the blooms that say what you feel.",
              ],
              [
                Flower2,
                "Create your bouquet",
                "Arrange the stems and tie them with ribbon.",
              ],
              [
                Mail,
                "Write your letter",
                "Put your own words on beautiful stationery.",
              ],
              [
                GiftIcon,
                "Send your surprise",
                "Share a private link or a scannable QR code.",
              ],
            ].map(([Icon, title, body]) => {
              const Symbol = Icon as typeof Sprout;
              return (
                <div key={String(title)}>
                  <Symbol size={27} />
                  <h3>{String(title)}</h3>
                  <p>{String(body)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="page featured">
        <h2>In bloom</h2>
        <div className="flower-strip">
          {[0, 1, 3, 6].map((type) => (
            <div key={type}>
              <svg viewBox="-35 -37 70 122" aria-hidden="true">
                <Flower type={type} />
              </svg>
              <h3>{flowers[type].name}</h3>
              <p>{flowers[type].meaning}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="closing">
        <Heart size={24} />
        <h2>For someone you wish you could hand flowers to.</h2>
        <Link className="button" to="/create">
          Make a Gift
        </Link>
      </section>
    </main>
  );
}

function PaymentCard({
  label,
  theme,
  qr,
  name,
  number,
}: {
  label: string;
  theme: string;
  qr?: string;
  name?: string;
  number?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className={"payment-card " + theme}>
      <header>
        <span className="payment-mark" aria-hidden="true">
          {label.slice(0, 1)}
        </span>
        <h2>{label}</h2>
      </header>
      <p>Scan to send support via {label}.</p>
      {qr && !imageFailed && (
        <div className="payment-image">
          <img
            src={qr}
            alt={label + " payment QR code"}
            width={280}
            height={280}
            onError={() => setImageFailed(true)}
          />
        </div>
      )}
      {(name || number) && (
        <dl>
          {name && (
            <>
              <dt>Account name</dt>
              <dd>{name}</dd>
            </>
          )}
          {number && (
            <>
              <dt>GCash number</dt>
              <dd>{number}</dd>
            </>
          )}
        </dl>
      )}
      {imageFailed && (
        <p role="status">The {label} QR code could not be loaded.</p>
      )}
    </article>
  );
}

function Support() {
  const name = import.meta.env.VITE_GCASH_NAME?.trim();
  const number = import.meta.env.VITE_GCASH_NUMBER?.trim();
  const gcash =
    import.meta.env.VITE_GCASH_QR_URL?.trim() ||
    import.meta.env.VITE_DEFAULT_GCASH_QR_URL;
  const cards = [
    { label: "GCash", theme: "payment-gcash", qr: gcash, name, number },
    {
      label: "MariBank",
      theme: "payment-mari",
      qr: import.meta.env.VITE_DEFAULT_MARIBANK_QR_URL,
    },
    {
      label: "GoTyme",
      theme: "payment-gotyme",
      qr: import.meta.env.VITE_DEFAULT_GOTYME_QR_URL,
    },
  ].filter((card) => card.qr || card.number);
  return (
    <main className="page support">
      <div className="support-intro">
        <Coffee size={32} aria-hidden="true" />
        <h1>Buy Me a Coffee</h1>
        <p>
          If you enjoyed sending a gift, choose a payment option below to
          support Bloom &amp; Letter.
        </p>
      </div>
      {cards.length ? (
        <div className="payment-grid">
          {cards.map((card) => (
            <PaymentCard key={card.label} {...card} />
          ))}
        </div>
      ) : (
        <p>Payment details are currently unavailable.</p>
      )}
    </main>
  );
}

function Account({ session }: { session: Session | null }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(
    session?.user.user_metadata.display_name || "",
  );
  useEffect(
    () => setName(session?.user.user_metadata.display_name || ""),
    [session?.user.id],
  );
  return (
    <main className="page narrow">
      <h1>{session ? "Account settings" : "Sign in"}</h1>
      {!db ? (
        <p>Sign-in is unavailable until Supabase is configured.</p>
      ) : session ? (
        <>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const { error } = await db!.auth.updateUser({
                data: { display_name: name },
              });
              setMessage(
                error
                  ? "Could not save your display name."
                  : "Display name saved.",
              );
            }}
          >
            <p>{session.user.email}</p>
            <label>
              Display name
              <input
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button className="button">Save settings</button>
          </form>
          <button
            onClick={async () => {
              const { error } = await db!.auth.signOut();
              setMessage(error ? "Could not sign out." : "Signed out.");
            }}
          >
            Sign out
          </button>
        </>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const { error } = await db!.auth.signInWithOtp({
              email,
              options: {
                emailRedirectTo:
                  location.origin +
                  (localStorage.getItem("bloom-draft")
                    ? "/create"
                    : "/letters"),
              },
            });
            setMessage(
              error
                ? "Could not send a sign-in link. Check your email address or try again."
                : "Check your email for the sign-in link.",
            );
            setBusy(false);
          }}
        >
          <label>
            Email{" "}
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            Email me a sign-in link
          </button>
        </form>
      )}
      <p role="status">{message}</p>
    </main>
  );
}

function Paper({ gift, photo }: { gift: Gift; photo?: string }) {
  return (
    <article
      className={"paper theme-" + themes.indexOf(gift.theme)}
      style={{
        fontFamily: gift.font,
        fontSize: gift.size,
        textAlign: gift.align as "left" | "center" | "right",
        color: gift.color,
      }}
    >
      {gift.decoration && <Sprout aria-hidden="true" />}
      {gift.date && (
        <p>
          <time dateTime={gift.date}>{gift.date}</time>
        </p>
      )}
      <h2>{gift.title || "Your letter title"}</h2>
      <p>Dear {gift.recipient || "someone special"},</p>
      <p className="letter-body">
        {gift.body || "Your words will appear here."}
      </p>
      {photo && (
        <img
          className="attachment"
          src={photo}
          alt="Photo included with the letter"
        />
      )}
      {gift.sender && (
        <p>
          With love,
          <br />
          {gift.sender}
        </p>
      )}
    </article>
  );
}

function Options({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function readDraft(): Gift {
  try {
    return {
      ...empty(),
      ...JSON.parse(localStorage.getItem("bloom-draft") || "{}"),
    };
  } catch {
    return empty();
  }
}

function EditorRoute(props: { session: Session | null; ready: boolean }) {
  const location = useLocation();
  return (
    <Editor
      key={location.key + ":" + (props.session?.user.id || "guest")}
      {...props}
    />
  );
}

function Editor({
  session,
  ready,
}: {
  session: Session | null;
  ready: boolean;
}) {
  const { id } = useParams();
  const editorKey = useLocation().key;
  const navigate = useNavigate();
  const [gift, setGift] = useState<Gift>(() => (id ? empty() : readDraft()));
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [clearPin, setClearPin] = useState(false);
  const [photo, setPhoto] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saved, setSaved] = useState(() =>
    JSON.stringify(!id && session ? empty() : gift),
  );
  const rowId = useRef(id || crypto.randomUUID());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const guest = !session || !db;
  const snapshot = JSON.stringify(gift);
  useEffect(() => {
    if (!id || !ready) return;
    if (!session || !db) {
      setLoading(false);
      setUnavailable(true);
      return;
    }
    let active = true;
    void db
      .from("gifts")
      .select("data")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setUnavailable(true);
          setMessage("This gift could not be opened for editing.");
        } else {
          const loaded = { ...empty(), ...data.data };
          setGift(loaded);
          setSaved(JSON.stringify(loaded));
          if (data.data.photo)
            void db!.storage
              .from("letter-photos")
              .createSignedUrl(data.data.photo, 3600)
              .then(({ data: result }) => {
                if (active) setPhoto(result?.signedUrl || "");
              });
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, ready, session?.user.id]);
  function persist(value: Gift, publish = false) {
    const operation = queue.current
      .catch(() => undefined)
      .then(async () => {
        const { data, error } = await db!.rpc("save_gift", {
          gift_id: rowId.current,
          payload: value,
          publish,
          new_pin: publish && !clearPin ? pin || null : null,
          clear_pin: publish && clearPin,
        });
        if (error) throw error;
        setSaved(JSON.stringify(value));
        if (!id) {
          if (
            location.pathname === "/create" &&
            (history.state?.key || "default") === editorKey
          )
            history.replaceState(history.state, "", "/create/" + rowId.current);
          localStorage.removeItem("bloom-draft");
        }
        return data as string | null;
      });
    queue.current = operation;
    return operation;
  }
  useEffect(() => {
    if (!ready || loading || unavailable || token || busy || snapshot === saved)
      return;
    if (guest) {
      try {
        localStorage.setItem("bloom-draft", snapshot);
        setSaved(snapshot);
      } catch {
        setMessage("This browser could not save the temporary draft.");
      }
      return;
    }
    const timer = setTimeout(() => {
      void persist(gift).catch(() =>
        setMessage("Autosave failed. Use Save Draft to retry."),
      );
    }, 750);
    return () => clearTimeout(timer);
  }, [ready, loading, unavailable, guest, token, busy, snapshot, saved]);
  useEffect(() => {
    if (snapshot === saved && !pendingFile) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved, snapshot, pendingFile]);
  function update<K extends keyof Gift>(key: K, value: Gift[K]) {
    setGift((previous) => ({ ...previous, [key]: value }));
    setMessage("");
  }
  function pick(type: number) {
    if (gift.flowers.length >= 24) {
      setMessage("This bouquet can hold up to 24 stems.");
      return;
    }
    setPicked(type);
    update("flowers", [...gift.flowers, { type, note: "" }]);
  }
  function remove(index: number) {
    update(
      "flowers",
      gift.flowers.filter((_, i) => i !== index),
    );
    setPicked(null);
  }
  async function save(publish: boolean) {
    if (publish) {
      if (pin && !clearPin && !/^[0-9]{6,12}$/.test(pin)) {
        setMessage("Enter a PIN of 6 to 12 digits.");
        return;
      }
      const validation = publishSchema.safeParse(gift);
      if (!validation.success) {
        setMessage(validation.error.issues[0].message);
        return;
      }
    }
    if (guest) {
      if (db) navigate("/account");
      else setMessage("Connect Supabase to save or publish this gift.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await persist(gift, publish);
      if (publish && result) setToken(result);
      else setMessage("Draft saved to your account.");
    } catch {
      setMessage(
        "Could not save the gift. Check your delivery dates and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (guest) {
      setMessage("Sign in to attach a photograph.");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Choose a JPEG, PNG, or WebP image under 5 MB.");
      return;
    }
    setPendingFile(file);
    setBusy(true);
    try {
      const path =
        session!.user.id + "/" + rowId.current + "/" + crypto.randomUUID();
      const { error } = await db!.storage
        .from("letter-photos")
        .upload(path, file);
      if (error) throw error;
      const signed = await db!.storage
        .from("letter-photos")
        .createSignedUrl(path, 3600);
      if (signed.error) throw signed.error;
      setPhoto(signed.data.signedUrl);
      update("photo", path);
    } catch {
      setMessage("The photograph could not be attached. Try again.");
    } finally {
      setBusy(false);
      setPendingFile(null);
    }
  }
  if (loading || !ready)
    return (
      <main className="page" role="status">
        Opening your gift…
      </main>
    );
  if (unavailable)
    return (
      <main className="page">
        <h1>Gift unavailable</h1>
        <p>{message || "Sign in to edit this gift."}</p>
        <Link to="/account">Account</Link>
      </main>
    );
  if (token)
    return (
      <main className="page narrow">
        <p className="eyebrow">
          <Heart size={16} /> Ready to send
        </p>
        <h1>Your gift is published</h1>
        <Sharing token={token} />
        <Link to="/letters">Manage your gifts</Link>
      </main>
    );
  return (
    <main className="page editor">
      <div className="steps" aria-label="Gift creation steps">
        {["Garden", "Bouquet", "Letter", "Preview"].map((label, index) => (
          <button
            key={label}
            aria-current={step === index ? "step" : undefined}
            onClick={() => {
              if (index > 0 && !gift.flowers.length) {
                setMessage("Pick at least one flower to continue.");
                return;
              }
              setStep(index);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="eyebrow">
        <Flower2 size={17} />{" "}
        {
          [
            "The picking garden",
            "The bouquet studio",
            "The writing desk",
            "The finishing touch",
          ][step]
        }
      </p>
      <h1>
        {
          [
            "Pick your flowers",
            "Arrange your bouquet",
            "Write your letter",
            "Preview your gift",
          ][step]
        }
      </h1>
      {step === 0 && (
        <>
          <p className="intro">Tap a bloom to add a stem to your bouquet.</p>
          <div className="picking">
            <GardenArt />
            <div className="beds">
              {flowers.map((flower, type) => (
                <button
                  key={flower.name}
                  className={picked === type ? "picked" : ""}
                  title={flower.description}
                  onClick={() => pick(type)}
                >
                  <svg
                    key={picked === type ? gift.flowers.length : 0}
                    viewBox="-36 -37 72 122"
                    aria-hidden="true"
                  >
                    <Flower type={type} />
                  </svg>
                  <span>{flower.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="selection">
            <strong>
              {gift.flowers.length}{" "}
              {gift.flowers.length === 1 ? "stem" : "stems"} picked
            </strong>
            {picked !== null && (
              <p role="status">
                {flowers[picked].name} · {flowers[picked].meaning}.{" "}
                {flowers[picked].description}
              </p>
            )}
            <div className="chips">
              {gift.flowers.map((flower, index) => (
                <button
                  key={index}
                  onClick={() => remove(index)}
                  aria-label={
                    "Remove " +
                    flowers[flower.type].name +
                    " stem " +
                    (index + 1)
                  }
                >
                  {flowers[flower.type].name} ×
                </button>
              ))}
            </div>
            <div className="actions">
              {gift.flowers.length > 0 && (
                <button onClick={() => remove(gift.flowers.length - 1)}>
                  Undo last stem
                </button>
              )}
              <button
                className="button"
                disabled={!gift.flowers.length}
                onClick={() => setStep(1)}
              >
                Arrange Bouquet
              </button>
            </div>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="split">
          <div className="controls">
            <Options
              label="Arrangement"
              options={arrangements}
              value={gift.arrangement}
              onChange={(value) => update("arrangement", value)}
            />
            <Options
              label="Wrapping paper"
              options={Object.keys(wraps)}
              value={gift.wrap}
              onChange={(value) => update("wrap", value)}
            />
            <Options
              label="Wrapper shape"
              options={folds}
              value={gift.fold}
              onChange={(value) => update("fold", value)}
            />
            <Options
              label="Ribbon"
              options={Object.keys(ribbons)}
              value={gift.ribbon}
              onChange={(value) => update("ribbon", value)}
            />
            <h2>Your stems</h2>
            {flowers.map((flower, type) => {
              const count = gift.flowers.filter(
                (stem) => stem.type === type,
              ).length;
              return (
                count > 0 && (
                  <div className="quantity" key={flower.name}>
                    <span>{flower.name}</span>
                    <button
                      aria-label={"Remove one " + flower.name}
                      onClick={() =>
                        remove(
                          gift.flowers.findLastIndex(
                            (stem) => stem.type === type,
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    <span>{count}</span>
                    <button
                      aria-label={"Add one " + flower.name}
                      disabled={gift.flowers.length >= 24}
                      onClick={() => pick(type)}
                    >
                      +
                    </button>
                  </div>
                )
              );
            })}
            <fieldset className="note-options">
              <legend>Bouquet notes</legend>
              <label className="check">
                <input
                  type="radio"
                  name="note-mode"
                  checked={gift.noteMode === "flowers"}
                  onChange={() => update("noteMode", "flowers")}
                />{" "}
                A note for each flower
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="note-mode"
                  checked={gift.noteMode === "bouquet"}
                  onChange={() => update("noteMode", "bouquet")}
                />{" "}
                One note for the whole bouquet
              </label>
            </fieldset>
            {gift.noteMode === "bouquet" && (
              <div className="message-field">
                <label htmlFor="bouquet-note">Bouquet note (optional)</label>
                <textarea
                  id="bouquet-note"
                  maxLength={1000}
                  rows={3}
                  value={gift.bouquetNote}
                  onChange={(event) =>
                    update("bouquetNote", event.target.value)
                  }
                />
              </div>
            )}
            {gift.noteMode === "flowers" &&
              gift.flowers.map((flower, index) => (
                <label key={index}>
                  Note for {flowers[flower.type].name} {index + 1}
                  <input
                    maxLength={200}
                    value={flower.note}
                    onChange={(event) =>
                      update(
                        "flowers",
                        gift.flowers.map((stem, i) =>
                          i === index
                            ? { ...stem, note: event.target.value }
                            : stem,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            <button
              className="button"
              disabled={!gift.flowers.length}
              onClick={() => setStep(2)}
            >
              Write Your Letter
            </button>
          </div>
          <div className="bouquet-panel arrangement-panel">
            <Bouquet
              gift={gift}
              onMove={(index, position) =>
                update(
                  "flowers",
                  gift.flowers.map((stem, i) =>
                    i === index ? { ...stem, position } : stem,
                  ),
                )
              }
            />
            <p>Drag a flower to move it, or focus it and use the arrow keys.</p>
            <button
              disabled={!gift.flowers.some((stem) => stem.position)}
              onClick={() =>
                update(
                  "flowers",
                  gift.flowers.map(({ type, note }) => ({ type, note })),
                )
              }
            >
              Reset flower positions
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <aside
          className="sender-support"
          aria-labelledby="sender-support-title"
        >
          <span className="sender-support-icon" aria-hidden="true">
            <Coffee size={23} />
          </span>
          <div>
            <h2 id="sender-support-title">Buy Me a Coffee</h2>
            <p>
              Enjoyed arranging your bouquet? A coffee is an optional way to
              support Bloom &amp; Letter.
            </p>
          </div>
          <Link
            className="button"
            to="/support"
            target="_blank"
            rel="noopener noreferrer"
          >
            View payment options{" "}
            <span className="sender-support-tab">(opens in a new tab)</span>
          </Link>
        </aside>
      )}
      {step === 2 && (
        <div className="split">
          <form
            className="controls"
            onSubmit={(event) => {
              event.preventDefault();
              setStep(3);
            }}
          >
            <label>
              Recipient
              <input
                required
                maxLength={100}
                value={gift.recipient}
                onChange={(event) => update("recipient", event.target.value)}
              />
            </label>
            <label>
              Sender (optional)
              <input
                maxLength={100}
                value={gift.sender}
                onChange={(event) => update("sender", event.target.value)}
              />
            </label>
            <label>
              Title
              <input
                required
                maxLength={140}
                value={gift.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </label>
            <div className="message-field">
              <label htmlFor="letter-message">Message</label>
              <textarea
                id="letter-message"
                required
                rows={7}
                maxLength={10000}
                value={gift.body}
                onChange={(event) => update("body", event.target.value)}
              />
            </div>
            <small>
              {gift.body.length.toLocaleString()} / 10,000 characters
            </small>
            <Options
              label="Stationery"
              options={themes}
              value={gift.theme}
              onChange={(value) => update("theme", value)}
            />
            <Options
              label="Font"
              options={fonts}
              value={gift.font}
              onChange={(value) => update("font", value)}
            />
            <label>
              Font size ({gift.size}px)
              <input
                type="range"
                min={16}
                max={36}
                value={gift.size}
                onChange={(event) => update("size", Number(event.target.value))}
              />
            </label>
            <Options
              label="Alignment"
              options={["left", "center", "right"]}
              value={gift.align}
              onChange={(value) => update("align", value)}
            />
            <Options
              label="Ink color"
              options={Object.keys(colors)}
              value={
                Object.keys(colors).find(
                  (key) => colors[key as keyof typeof colors] === gift.color,
                ) || "Warm ink"
              }
              onChange={(value) =>
                update("color", colors[value as keyof typeof colors])
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={gift.decoration}
                onChange={(event) => update("decoration", event.target.checked)}
              />{" "}
              Botanical decoration
            </label>
            <label>
              Letter date (optional)
              <input
                type="date"
                value={gift.date}
                onChange={(event) => update("date", event.target.value)}
              />
            </label>
            {!guest ? (
              <label>
                Photograph (optional)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.files?.[0])
                      void upload(event.target.files[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            ) : (
              <p>Sign in to add a photograph.</p>
            )}
            {gift.photo && (
              <button
                type="button"
                onClick={() => {
                  setPhoto("");
                  update("photo", "");
                }}
              >
                Remove photograph
              </button>
            )}
            <button className="button" disabled={busy}>
              Preview Gift
            </button>
          </form>
          <Paper gift={gift} photo={photo} />
        </div>
      )}
      {step === 3 && (
        <>
          <div className="split">
            <div>
              <div className="bouquet-panel">
                <Bouquet gift={gift} />
              </div>
              <p>
                {gift.arrangement} · {gift.wrap} · {gift.ribbon} ribbon
                {gift.fold !== folds[0] && <> · {gift.fold}</>}
              </p>
              <BouquetNotes gift={gift} />
              <label>
                Available from (optional)
                <input
                  type="datetime-local"
                  value={localDate(gift.scheduled)}
                  onChange={(event) =>
                    update(
                      "scheduled",
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : "",
                    )
                  }
                />
              </label>
              <label>
                Expires at (optional)
                <input
                  type="datetime-local"
                  value={localDate(gift.expires)}
                  onChange={(event) =>
                    update(
                      "expires",
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : "",
                    )
                  }
                />
              </label>
              <label>
                Access PIN (optional)
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={12}
                  autoComplete="new-password"
                  disabled={clearPin}
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                />
              </label>
              {id && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={clearPin}
                    onChange={(event) => setClearPin(event.target.checked)}
                  />{" "}
                  Remove any existing access PIN on publish
                </label>
              )}
              <p>
                Set a PIN when publishing and send it separately from the link.
              </p>
            </div>
            <Paper gift={gift} photo={photo} />
          </div>
          <div className="actions">
            <button onClick={() => setStep(1)}>Edit Bouquet</button>
            <button onClick={() => setStep(2)}>Edit Letter</button>
            <button disabled={busy} onClick={() => void save(false)}>
              Save Draft
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => void save(true)}
            >
              Publish Gift
            </button>
          </div>
        </>
      )}
      <p role="status">
        {message ||
          (pendingFile
            ? "Uploading photograph…"
            : busy
              ? "Saving gift…"
              : snapshot === saved
                ? guest
                  ? "Temporary draft saved on this device."
                  : "Changes saved to your account."
                : "Changes pending.")}
      </p>
    </main>
  );
}

function BouquetNotes({ gift }: { gift: Gift }) {
  if (gift.noteMode === "bouquet")
    return (
      gift.bouquetNote && (
        <blockquote className="bouquet-note">{gift.bouquetNote}</blockquote>
      )
    );
  const notes = gift.flowers
    .map((stem, index) => ({ stem, index }))
    .filter(({ stem }) => stem.note.trim());
  return (
    notes.length > 0 && (
      <ul className="flower-notes">
        {notes.map(({ stem, index }) => (
          <li key={index}>
            <strong>
              {flowers[stem.type].name} {index + 1}
            </strong>
            <p>{stem.note}</p>
          </li>
        ))}
      </ul>
    )
  );
}

function localDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function Sharing({ token }: { token: string }) {
  const link = shareUrl(token);
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    import("qrcode")
      .then(({ default: qr }) =>
        qr.toDataURL(link, {
          width: 320,
          margin: 4,
          errorCorrectionLevel: "M",
        }),
      )
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => {
        if (active) setMessage("Could not generate a QR code.");
      });
    return () => {
      active = false;
    };
  }, [link]);
  return (
    <section className="sharing">
      <label>
        Gift link
        <input
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <div className="actions">
        <button
          onClick={() =>
            void (
              navigator.clipboard?.writeText(link) || Promise.reject()
            ).then(
              () => setMessage("Link copied."),
              () => setMessage("Select the link above to copy it."),
            )
          }
        >
          Copy link
        </button>
        {navigator.share && (
          <button
            onClick={() =>
              void navigator
                .share({ title: "A gift from Bloom & Letter", url: link })
                .catch((error) => {
                  if (error.name !== "AbortError")
                    setMessage("Sharing failed. Copy the link instead.");
                })
            }
          >
            Share
          </button>
        )}
      </div>
      {image && (
        <>
          <img
            width="180"
            height="180"
            src={image}
            alt="QR code for this gift"
          />
          <a className="button" href={image} download="bloom-and-letter.png">
            Download QR code
          </a>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}

function Dashboard({
  session,
  ready,
}: {
  session: Session | null;
  ready: boolean;
}) {
  const [rows, setRows] = useState<GiftRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const { data, error } = await db!
      .from("gifts")
      .select(
        "id,data,token,revoked,created_at,updated_at,gift_publications(scheduled_at,expires_at)",
      )
      .order("updated_at", { ascending: false })
      .overrideTypes<GiftRow[], { merge: false }>();
    if (error) setMessage("Could not load your gifts.");
    else setRows(data);
    setLoading(false);
  }
  useEffect(() => {
    setRows([]);
    setShare("");
    if (session && db) {
      setLoading(true);
      void load();
    }
  }, [session?.user.id]);
  if (!ready)
    return (
      <main className="page" role="status">
        Checking your session…
      </main>
    );
  if (!session)
    return (
      <main className="page narrow">
        <h1>My Letters</h1>
        <Link className="button" to="/account">
          Sign in to view your gifts
        </Link>
      </main>
    );
  async function manage(row: GiftRow, action: string) {
    if (action === "delete" && !window.confirm("Permanently delete this gift?"))
      return;
    setBusy(true);
    setMessage("");
    const { error } = await db!.rpc("manage_gift", { gift_id: row.id, action });
    if (error) setMessage("Could not update the gift.");
    else {
      setShare("");
      await load();
      if (action === "delete") {
        const bucket = db!.storage.from("letter-photos");
        const folder = session!.user.id + "/" + row.id;
        const files = await bucket.list(folder, { limit: 1000 });
        if (files.error)
          setMessage("Gift deleted. Its private photos could not be removed.");
        else if (files.data.length) {
          const { error: cleanupError } = await bucket.remove(
            files.data.map((file) => folder + "/" + file.name),
          );
          if (cleanupError)
            setMessage(
              "Gift deleted. Its private photos could not be removed.",
            );
        }
      }
    }
    setBusy(false);
  }
  return (
    <main className="page">
      <h1>My Gifts</h1>
      <div className="actions">
        <Link className="button" to="/create">
          Create New Gift
        </Link>
        <Link to="/account">Account Settings</Link>
      </div>
      <p role="status">{loading ? "Loading gifts…" : message}</p>
      {[false, true].map((published) => (
        <section className="dashboard-list" key={String(published)}>
          <h2>{published ? "Published Letters" : "Draft Letters"}</h2>
          {!loading &&
            !rows.some((row) => Boolean(row.token) === published) && (
              <p>No {published ? "published gifts" : "drafts"} yet.</p>
            )}
          {rows
            .filter((row) => Boolean(row.token) === published)
            .map((row) => (
              <article key={row.id}>
                <h3>{row.data.recipient || "Untitled gift"}</h3>
                <p>
                  {new Date(row.created_at).toLocaleDateString()} ·{" "}
                  {row.token
                    ? row.revoked
                      ? "Revoked"
                      : row.gift_publications?.expires_at &&
                          new Date(
                            row.gift_publications.expires_at,
                          ).getTime() <= Date.now()
                        ? "Expired"
                        : row.gift_publications?.scheduled_at &&
                            new Date(
                              row.gift_publications.scheduled_at,
                            ).getTime() > Date.now()
                          ? "Scheduled"
                          : "Published"
                    : "Draft"}
                </p>
                <div className="actions">
                  <Link to={"/create/" + row.id}>Edit</Link>
                  {row.token && (
                    <>
                      <button
                        onClick={() => setShare(share === row.id ? "" : row.id)}
                      >
                        Link and QR code
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void manage(row, row.revoked ? "restore" : "revoke")
                        }
                      >
                        {row.revoked ? "Restore link" : "Revoke link"}
                      </button>
                    </>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => void manage(row, "delete")}
                  >
                    Delete
                  </button>
                </div>
                {share === row.id && row.token && <Sharing token={row.token} />}
              </article>
            ))}
        </section>
      ))}
    </main>
  );
}

function Recipient() {
  const { token } = useParams();
  const [record, setRecord] = useState<{
    gift: Gift;
    photo: string;
    photoUnavailable?: boolean;
  } | null>(null);
  const [state, setState] = useState("loading");
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState(0);
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let active = true;
    setStage(0);
    setRecord(null);
    setState("loading");
    setSelected(0);
    setPin("");
    setPinMessage("");
    if (!db || !token || !/^[-_a-zA-Z0-9]{43}$/.test(token)) {
      setState("unavailable");
      return;
    }
    void db.functions
      .invoke("read-gift", { body: { token } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setState("error");
        else if (!data) setState("unavailable");
        else if (data.pinRequired) setState("pin");
        else {
          setRecord(data);
          setState("ready");
        }
      });
    return () => {
      active = false;
    };
  }, [token]);
  if (state === "pin")
    return (
      <main className="page narrow">
        <h1>Enter the gift PIN</h1>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setUnlocking(true);
            setPinMessage("");
            const { data, error } = await db!.functions.invoke("read-gift", {
              body: { token, pin },
            });
            setUnlocking(false);
            if (error)
              setPinMessage("The gift could not be unlocked. Try again.");
            else if (!data) setState("unavailable");
            else if (data.pinRequired)
              setPinMessage(
                data.locked
                  ? "Too many attempts. Try again in ten minutes."
                  : "That PIN did not match.",
              );
            else {
              setRecord(data);
              setState("ready");
            }
          }}
        >
          <label>
            Gift PIN
            <input
              type="password"
              inputMode="numeric"
              required
              pattern="[0-9]{6,12}"
              maxLength={12}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          <button className="button" disabled={unlocking}>
            Unlock Gift
          </button>
          <p role="status">{pinMessage}</p>
        </form>
      </main>
    );
  if (!record)
    return (
      <main className="page narrow">
        <h1>
          {state === "loading" ? "Opening your gift…" : "Gift unavailable"}
        </h1>
        {state !== "loading" && (
          <p>
            {state === "error"
              ? "The gift could not be loaded. Refresh to try again."
              : "This link may be invalid, scheduled for later, revoked, or expired."}
          </p>
        )}
      </main>
    );
  async function openLetter() {
    if (!db || opening) return;
    setOpening(true);
    const minReveal = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? Promise.resolve()
      : new Promise((resolve) => setTimeout(resolve, 320));
    const { data, error } = await db.functions.invoke("read-gift", {
      body: { token, openLetter: true, pin },
    });
    await minReveal;
    setOpening(false);
    if (error) {
      setState("error");
      return;
    }
    if (!data) {
      setRecord(null);
      setState("unavailable");
      return;
    }
    if (data.pinRequired) {
      setRecord(null);
      setState("pin");
      setStage(0);
      return;
    }
    setRecord(data);
    setStage(4);
  }
  const { gift, photo } = record;
  const stem = gift.flowers[selected];
  return (
    <main className="recipient">
      <motion.section
        key={stage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page receive-stage"
      >
        {stage === 0 && (
          <>
            <GardenArt />
            <h1>Someone picked these flowers just for you.</h1>
            <button className="button" onClick={() => setStage(1)}>
              Enter the Garden
            </button>
          </>
        )}
        {stage === 1 && (
          <>
            <GardenArt />
            <h1>Welcome, {gift.recipient}.</h1>
            <p>Something is blooming here for you.</p>
            <button className="button" onClick={() => setStage(2)}>
              Reveal the Bouquet
            </button>
          </>
        )}
        {stage === 2 && (
          <>
            <h1>Flowers for {gift.recipient}</h1>
            <Bouquet gift={gift} onPick={setSelected} />
            <div className="chips centered">
              {gift.flowers.map((flower, index) => (
                <button
                  key={index}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  {flowers[flower.type].name}{" "}
                  {gift.flowers.filter((item) => item.type === flower.type)
                    .length > 1
                    ? index + 1
                    : ""}
                </button>
              ))}
            </div>
            {stem && (
              <div aria-live="polite">
                <h3>{flowers[stem.type].meaning}</h3>
                {gift.noteMode !== "bouquet" && stem.note && (
                  <p className="bouquet-note">{stem.note}</p>
                )}
              </div>
            )}
            {gift.noteMode === "bouquet" && <BouquetNotes gift={gift} />}
            <button className="button" onClick={() => setStage(3)}>
              See the Envelope
            </button>
          </>
        )}
        {stage === 3 && (
          <>
            <h1>A letter for {gift.recipient}</h1>
            <button
              className={opening ? "envelope opening" : "envelope"}
              disabled={opening}
              onClick={() => void openLetter()}
              aria-label="Open the letter"
            >
              <span className="seal">
                <Heart fill="currentColor" size={22} />
              </span>
              <span>To {gift.recipient}</span>
              {gift.sender && <small>From {gift.sender}</small>}
            </button>
            <p role="status">
              {opening
                ? "Opening your letter…"
                : state === "error"
                  ? "The letter could not be opened. Tap the seal to retry."
                  : "Tap the seal to open your letter."}
            </p>
          </>
        )}
        {stage === 4 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="letter-reveal held-letter"
            >
              <div className="held-bouquet">
                <Bouquet gift={gift} />
                <svg viewBox="0 0 110 90" aria-hidden="true">
                  <path
                    d="M37 90L32 66Q17 55 13 42Q10 34 19 30L36 42L37 16Q37 7 45 7Q53 7 54 17L56 37Q67 30 74 39Q84 36 89 45Q99 45 98 55Q96 73 84 90Z"
                    fill="#bc886d"
                    stroke="#784b3f"
                    strokeWidth="2"
                  />
                  <path
                    d="M56 43L59 53M74 42L76 53M89 47L89 57"
                    fill="none"
                    stroke="#885440"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <Paper gift={gift} photo={photo} />
            </motion.div>
            {record.photoUnavailable && (
              <p>The photograph could not be loaded.</p>
            )}
            <p className="signoff">
              Some flowers bloom in gardens. Others bloom in the heart.
            </p>
            <Keepsake />
          </>
        )}
      </motion.section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
