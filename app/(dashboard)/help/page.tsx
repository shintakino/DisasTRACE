import { ShieldCheck, FileText } from "lucide-react";
import Link from "next/link";

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const resolvedParams = await searchParams;
  const tab = resolvedParams.tab || "privacy";

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-white">
      {/* Sidebar Navigation */}
      <div className="w-[280px] border-r border-[#E2E8F0] p-6 hidden md:block shrink-0">
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-4">
          HOME / HELP
        </div>
        
        <nav className="space-y-1">
          <Link
            href="/help?tab=privacy"
            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
              tab === "privacy" 
                ? "bg-[#E2E8F0] text-[#1E293B] font-medium" 
                : "text-[#64748B] hover:bg-slate-50"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            Privacy Policy
          </Link>
          
          <Link
            href="/help?tab=terms"
            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-colors ${
              tab === "terms" 
                ? "bg-[#E2E8F0] text-[#1E293B] font-medium" 
                : "text-[#64748B] hover:bg-slate-50"
            }`}
          >
            <FileText className="h-5 w-5" />
            Terms & Conditions
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full overflow-y-auto">
        <div className="md:hidden text-[10px] uppercase font-bold text-muted-foreground mb-6">
          HOME / HELP
        </div>
        
        <div className="w-full">
          <div className="flex justify-center mb-10">
            <div className="border-b border-[#E2E8F0] w-full max-w-md text-center pb-3">
              <span className="font-semibold text-lg text-[#1E3A8A] border-b-2 border-[#1E3A8A] pb-3 px-2 inline-block">
                {tab === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
              </span>
            </div>
          </div>

          <div className="max-w-2xl mx-auto text-sm text-[#475569] leading-relaxed space-y-4 pb-12">
            {tab === "privacy" ? (
              <>
                <p>
                  <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
                </p>
                <p>
                  At DisasTRACE, accessible from the CDRRMO portal, one of our main priorities is the privacy of our users. This Privacy Policy document contains types of information that is collected and recorded by DisasTRACE and how we use it.
                </p>
                <p>
                  If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.
                </p>
                <h3 className="font-bold text-[#1E293B] text-base mt-6 mb-2">Consent</h3>
                <p>
                  By using our application, you hereby consent to our Privacy Policy and agree to its terms.
                </p>
                <h3 className="font-bold text-[#1E293B] text-base mt-6 mb-2">Information we collect</h3>
                <p>
                  The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
                </p>
                <p>
                  If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
                </p>
                <h3 className="font-bold text-[#1E293B] text-base mt-6 mb-2">Welcome to DisasTRACE!</h3>
                <p>
                  These terms and conditions outline the rules and regulations for the use of the DisasTRACE System.
                </p>
                <p>
                  By accessing this system we assume you accept these terms and conditions. Do not continue to use DisasTRACE if you do not agree to take all of the terms and conditions stated on this page.
                </p>
                <h3 className="font-bold text-[#1E293B] text-base mt-6 mb-2">License</h3>
                <p>
                  Unless otherwise stated, DisasTRACE and/or its licensors own the intellectual property rights for all material on DisasTRACE. All intellectual property rights are reserved. You may access this from DisasTRACE for your own personal use subjected to restrictions set in these terms and conditions.
                </p>
                <h3 className="font-bold text-[#1E293B] text-base mt-6 mb-2">You must not:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Republish material from DisasTRACE</li>
                  <li>Sell, rent or sub-license material from DisasTRACE</li>
                  <li>Reproduce, duplicate or copy material from DisasTRACE</li>
                  <li>Redistribute content from DisasTRACE</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
