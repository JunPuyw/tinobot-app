"use client";

export default function AnimatedBackground() {
  return (
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#17120f] pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#f97815_1px,transparent_1px),linear-gradient(to_bottom,#f97815_1px,transparent_1px)] [background-size:56px_56px]" />

        {/* Warm depth */}
        <div className="absolute -top-24 left-1/4 h-[620px] w-[620px] rounded-full bg-[#f97815]/18 blur-[130px] animate-[blob_20s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-[#9f4f1c]/18 blur-[130px] animate-[blob_22s_ease-in-out_2s_infinite]" />
        <div className="absolute -bottom-28 left-1/2 h-[580px] w-[580px] rounded-full bg-[#3a2417]/70 blur-[140px] animate-[blob_25s_ease-in-out_4s_infinite]" />

        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(23,18,15,0.5)_100%)]" />
      </div>
    </>
  );
}

