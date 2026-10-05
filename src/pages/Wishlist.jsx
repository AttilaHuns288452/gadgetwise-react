import { Link } from "react-router-dom";
import { GW } from "../lib.js";
import { GadgetCard, useWishlist } from "../components/ui.jsx";

function Wishlist() {
  const wish = useWishlist();
  const gadgets = GW.gadgets.filter((g) => wish.has(g.id));

  return (
    <section className="section">
      <div className="eyebrow">Account</div>
      <h1 className="mt-2 text-[2.25rem] lg:text-[2.75rem]">Wishlist</h1>
      <p className="mt-2 text-ink2">
        Gadgets you saved for later · {gadgets.length} item{gadgets.length === 1 ? "" : "s"}
      </p>

      {gadgets.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">Your wishlist is empty.</p>
          <p className="mt-2 text-ink2">Tap the heart on any gadget to save it here.</p>
          <Link to="/gadgets" className="btn-primary mt-6 inline-flex">Browse gadgets</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {gadgets.map((g) => (
            <GadgetCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Wishlist;
