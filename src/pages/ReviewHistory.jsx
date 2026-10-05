import { Link } from "react-router-dom";

// ponytail: demo seed, clearly fictional sample reviews
export const myReviews = [
  {
    gadget: "Apple MacBook Air M1",
    rating: 5,
    date: "Sep 12, 2026",
    body: "Battery easily lasts a full day of classes. Silent, light, and fast enough for everything I throw at it — best value in the lineup.",
  },
  {
    gadget: "Xiaomi Pad 7",
    rating: 4,
    date: "Aug 30, 2026",
    body: "Great screen for the price and perfect for reading notes. The speakers are just okay, and I wish the stylus came in the box.",
  },
  {
    gadget: "JBL Synchros E50BT",
    rating: 4,
    date: "Aug 3, 2026",
    body: "Comfortable for long study sessions and the battery lasts a week of light use. Noise isolation is average at this price.",
  },
  {
    gadget: "Anker PowerCore 20100",
    rating: 5,
    date: "Jul 21, 2026",
    body: "Charges my phone several times over. Heavy, but it lives in my bag anyway — a lifesaver during long days on campus.",
  },
];

function ReviewHistory() {
  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Review history</h1>
      <p className="mt-2 text-ink2">
        Everything you have reviewed · {myReviews.length} reviews · demo data
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {myReviews.map((r) => (
          <article key={r.gadget} className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold text-ink break-words">{r.gadget}</h2>
              <span className="text-sm text-ink3">{r.date}</span>
            </div>
            <div className="mt-1 text-star" aria-label={`Rated ${r.rating} out of 5`}>
              {"★".repeat(r.rating)}
              <span className="text-ink3">{"★".repeat(5 - r.rating)}</span>
            </div>
            <p className="mt-3 text-sm text-ink2">{r.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <Link to="/profile" className="font-semibold text-primary hover:text-primary-dark">← Back to profile</Link>
      </div>
    </section>
  );
}

export default ReviewHistory;
