"use client";

export default function AnimatedBackground() {
  return (
    <>
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-[#181411] pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#f97815_1px,transparent_1px),linear-gradient(to_bottom,#f97815_1px,transparent_1px)] [background-size:50px_50px]" />

        {/* Animated gradient orbs */}
        <div className="absolute -top-20 left-1/4 h-[600px] w-[600px] rounded-full bg-[#f97815]/20 blur-[120px] animate-[blob_20s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-purple-500/15 blur-[120px] animate-[blob_22s_ease-in-out_2s_infinite]" />
        <div className="absolute -bottom-20 left-1/2 h-[550px] w-[550px] rounded-full bg-blue-500/12 blur-[120px] animate-[blob_25s_ease-in-out_4s_infinite]" />

        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(24,20,17,0.4)_100%)]" />
      </div>
    </>
  );
}

