import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { KubeSDKLocalRun } from '../../../types';

interface FeasibilityStepProps {
  config: KubeSDKLocalRun;
  isValidating: boolean;
}

export const FeasibilityStep = ({ config, isValidating }: FeasibilityStepProps) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-[#495057]">Resource demand vs. laptop capacity.</p>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold",
          config.validation?.status === 'pass' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        )}>
          {config.validation?.status === 'pass' ? 'All Checks Passed' : 'Issues Detected'}
        </div>
      </div>

      <div className="space-y-4">
        {isValidating ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {config.validation?.issues.map((issue, idx) => (
              <div key={idx} className={cn(
                "p-6 rounded-xl border space-y-4",
                issue.severity === 'error' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
              )}>
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className={issue.severity === 'error' ? "text-red-600" : "text-yellow-600"} />
                  <h4 className={cn("font-bold", issue.severity === 'error' ? "text-red-800" : "text-yellow-800")}>
                    {issue.severity === 'error' ? 'Critical Error' : 'Resource Warning'}
                  </h4>
                </div>
                <div className="pl-8 space-y-2">
                  <p className={cn("text-sm", issue.severity === 'error' ? "text-red-700" : "text-yellow-700")}>{issue.message}</p>
                  {issue.suggestion && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button className="px-3 py-1.5 bg-white border border-yellow-300 rounded-lg text-xs font-bold text-yellow-800 hover:bg-yellow-100">
                        ✔ Apply Suggestion: {String(issue.suggestion.proposedChange.value)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {config.validation?.issues.length === 0 && (
              <div className="p-6 rounded-xl border border-green-200 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <h4 className="font-bold text-green-800">No Issues Detected</h4>
                </div>
                <p className="pl-8 text-sm text-green-700 mt-1">Your configuration fits perfectly within the laptop constraints.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
