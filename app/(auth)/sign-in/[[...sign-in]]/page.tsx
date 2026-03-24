// app/sign-in/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Eye, EyeOff } from "lucide-react";

const SignInPage = () => {
  const [step, setStep] = useState<
    "signIn" | "forgotPassword" | "verifyOTP" | "resetPassword"
  >("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resetSession, setResetSession] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  useEffect(() => {
    setError("");
    setSuccessMessage("");
  }, [step]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.session) {
        throw new Error(error?.message || "Invalid credentials");
      }
      router.push(`/callback`);
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw new Error(error.message);

      setStep("verifyOTP");
      setSuccessMessage(
        `Reset link sent to ${email}. Please check your inbox.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to send reset instructions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    // e.preventDefault();
    // setIsLoading(true);
    // setError("");
    // if (newPassword !== confirmPassword) {
    //   setError("Passwords do not match");
    //   setIsLoading(false);
    //   return;
    // }
    // if (newPassword.length < 8) {
    //   setError("Password must be at least 8 characters");
    //   setIsLoading(false);
    //   return;
    // }
    // try {
    //   if (!resetSession) {
    //     throw new Error(
    //       "Reset session not available. Please restart the process."
    //     );
    //   }
    //   // Complete password reset
    //   const result = await resetSession.resetPassword({
    //     password: newPassword,
    //   });
    //   if (result.status === "complete") {
    //     // Sign in with new password
    //     await setActive({ session: result.createdSessionId });
    //     // router.push('/callback');
    //     router.push(`${process.env.NEXT_PUBLIC_BASE_URL}/callback`);
    //   } else {
    //     throw new Error("Password reset failed. Please try again.");
    //   }
    // } catch (err: any) {
    //   setError(
    //     err.errors?.[0]?.longMessage ||
    //       err.errors?.[0]?.message ||
    //       "Failed to reset password. Please try again."
    //   );
    //   console.error("Password reset error:", err);
    // } finally {
    //   setIsLoading(false);
    // }
  };

  // Render different images based on step
  const renderImage = () => {
    return (
      <div>
        {step === "signIn" && (
          <div>
            <Image
              src={"/signin.png"}
              alt="signin img"
              width={480}
              height={800}
              className="hidden h-[550px] lg:block object-cover rounded-md shadow-md"
              
         
            priority
              
            />
            {/* <Image  src={`${process.env.NEXT_PUBLIC_BASE_PATH}/signin.png`}     fill alt='signin image'  priority objectFit='cover'    /> */}
          </div>
        )}
        {step === "forgotPassword" && (
          <div className="bg-yellow-100 rounded-xl w-full h-full flex items-center justify-center text-yellow-800 font-medium">
            <Image
              src={"/signin.png"}
              alt="forgot passswor img"
              width={480}
              height={800}
              className="hidden h-[550px] lg:block object-cover rounded-md shadow-md"
              priority
            />
            {/* <Image  src={`${process.env.NEXT_PUBLIC_BASE_PATH}/step2.png`}     fill alt='signin image'  priority objectFit='cover'    /> */}
          </div>
        )}
        {step === "verifyOTP" ||
          (step === "resetPassword" && (
            <div className="bg-purple-100 rounded-xl w-full h-full flex items-center justify-center text-purple-800 font-medium">
              <Image
                src={"/step3.png"}
                alt="signin image"
                width={400}
                height={700}
                className="hidden lg:block"
                priority
              />
              {/* <Image  src={`${process.env.NEXT_PUBLIC_BASE_PATH}/step3.png`}     fill alt='signin image'  priority objectFit='cover'    /> */}
            </div>
          ))}
        {step === "resetPassword" && (
          <div className="bg-green-100 border-2 border-green-300 rounded-xl w-full h-full flex items-center justify-center text-green-800 font-medium">
            <div className="text-center p-4">
              <div className="text-2xl mb-2">Create New Password</div>
              <div>Set a strong, secure password</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#eef0fb] px-3 py-4 sm:px-4 sm:py-8 lg:px-8">
      {step === "signIn" ? (
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1120px] items-center justify-center sm:min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-[985px] rounded-2xl shadow-[0_24px_60px_rgba(58,41,99,0.16)]">
            <div className="relative overflow-hidden rounded-2xl lg:flex lg:h-[679px] lg:w-[985px]">
              <div className="relative flex min-h-[240px] overflow-hidden rounded-t-2xl bg-[linear-gradient(140deg,#5800AB_0%,#8E4CCD_52%,#562981_100%)] text-white sm:min-h-[320px] lg:min-h-[510px] lg:w-[430px] lg:rounded-l-2xl lg:rounded-tr-none">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-16 -top-12 h-64 w-64 rounded-full bg-[#c4b4ff]/20 blur-[120px]" />
                  <div className="absolute bottom-8 right-6 h-56 w-56 rounded-full bg-[#ad2bff]/20 blur-[100px]" />
                  <div className="absolute left-8 top-24 h-72 w-72 rounded-full bg-[#2b7fff]/15 blur-[160px]" />
                </div>

                <div className="relative z-10 flex h-full w-full flex-col">
                  <div className="flex flex-col items-center pt-6 sm:pt-8 lg:pt-10">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/passprive.jpeg"
                        alt="Passprive Icon"
                        width={50}
                        height={50}
                        className="h-auto w-[40px] sm:w-[45px] lg:w-[50px]"
                        priority
                      />
                      <Image
                        src="/Group 3.png"
                        alt="Pass Prive"
                        width={180}
                        height={55}
                        className="h-auto w-[130px] sm:w-[160px] lg:w-[180px]"
                        priority
                      />
                    </div>
                    <p className="mt-2 px-3 text-center text-[11px] font-semibold leading-none text-white sm:whitespace-nowrap sm:text-xs">
                      Your Pass to the Island&apos;s Best.
                    </p>
                  </div>

                  <div className="flex flex-1 items-center justify-center px-4 pb-6 text-center sm:px-3 sm:pb-10">
                    <div className="mx-auto w-full max-w-[415px]">
                      <h2 className="text-[40px] font-bold leading-[1.05] tracking-[-1px] sm:text-[48px] sm:leading-[48px] sm:tracking-[-1.2px]">Welcome!</h2>
                      <p className="mt-2 text-base font-normal leading-7 text-white/80 sm:mt-3 sm:whitespace-nowrap sm:text-[20px] sm:leading-[32.5px]">
                        Manage experiences. Control your platform.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full rounded-b-2xl border-[0.67px] border-white/20 bg-white/[0.12] px-5 py-6 shadow-[0_8px_32px_rgba(31,38,135,0.15)] sm:px-8 sm:py-8 lg:-ml-px lg:flex lg:h-[679px] lg:w-[555px] lg:rounded-r-2xl lg:rounded-bl-none lg:border-l-0 lg:flex-col lg:px-12 lg:py-12">
                <div className="mb-8 lg:mb-12 lg:w-[459px]">
                  <h1 className="text-[28px] font-bold leading-[1.15] text-black sm:text-[30px] sm:leading-[36px]">Admin Login</h1>
                  <p className="mt-1 text-base leading-6 text-[#45556C]">Access your dashboard</p>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleSignIn} className="flex h-full w-full flex-col lg:w-[459px]">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium leading-5 text-[#45556C]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-[49.33px] w-full rounded-[14px] border-[0.67px] border-white/30 bg-white/60 px-4 py-3 text-base text-[#0a0a0a]/50 shadow-sm outline-none transition focus:border-[#8e4ccd] focus:ring-2 focus:ring-[#8e4ccd]/25"
                      placeholder="admin@passprive.com"
                      required
                    />
                  </div>

                  <div className="mt-6 space-y-2">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium leading-5 text-[#45556C]"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-[49.33px] w-full rounded-[14px] border-[0.67px] border-white/30 bg-white/60 px-4 py-3 pr-11 text-base text-[#0a0a0a]/50 shadow-sm outline-none transition focus:border-[#8e4ccd] focus:ring-2 focus:ring-[#8e4ccd]/25"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6d7081] hover:text-[#43465c]"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center">
                    <label className="flex items-center gap-[10px] text-sm leading-5 text-[#45556C]">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded-[4px] border-[0.2px] border-black bg-white text-[#701ad2] focus:ring-[#8e4ccd]"
                      />
                      Remember me
                    </label>
                  </div>

                  <div className="mt-auto pt-10 sm:pt-20 lg:pt-32">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-[58px] w-full rounded-[20px] bg-[linear-gradient(90deg,#5800AB_0%,#A866E7_100%)] px-6 py-[13px] text-sm font-semibold leading-[1] text-white shadow-[0_10px_24px_rgba(88,0,171,0.35)] transition hover:brightness-110 disabled:opacity-50 lg:px-[154px]"
                    >
                      {isLoading ? "Signing in..." : "Login"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("forgotPassword")}
                      className="mt-8 block w-full text-center text-xs font-normal leading-4 text-[#45556C] transition hover:text-[#2f3b53] lg:mt-10 lg:text-[10px]"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center gap-0 lg:gap-10">
          {renderImage()}

          <div>
            {/* Forgot Password Form */}
            {step === "forgotPassword" && (
          <div className="w-full lg:w-auto px-4 py-8 lg:p-0">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Forgot Your Password?
              </h1>
              <p className="text-gray-600">
                Enter your email to receive a verification code
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400 text-gray-600"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className=" cursor-pointer w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </div>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setStep("signIn")}
                  className=" cursor-pointer font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        )}

            {/* OTP Verification Form */}
            {step === "verifyOTP" && (
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Verify Your Email
                  </h1>
                  <p className="text-gray-600">
                    Verification Link Has been Sent on your email
                    <span className="font-semibold"> {email}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Reset Password Form */}
            {step === "resetPassword" && (
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Create New Password
                  </h1>
                  <p className="text-gray-600">
                    Your new password must be different from previous passwords
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter new password"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 8 characters with letters and numbers
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>

                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("verifyOTP");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="font-medium text-indigo-600 hover:text-indigo-500 mr-4"
                    >
                      Back to Verification
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("signIn")}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignInPage;
