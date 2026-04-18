export default function ProductVideo() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col">
      <h3 className="text-white text-lg font-semibold mb-4">
        See Ropeli in Action
      </h3>

      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
        <video
          src="/demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      <p className="text-sm text-gray-400 mt-4">
        Turn prompts into production-ready apps in seconds.
      </p>
    </div>
  );
}
