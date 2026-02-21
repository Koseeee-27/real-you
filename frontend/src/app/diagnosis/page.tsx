import DiagnosisFlow from '@/features/diagnosis/components/DiagnosisFlow';

export default function DiagnosisPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-page-pattern p-4">
      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center">
        <DiagnosisFlow />
      </div>
    </div>
  );
}
