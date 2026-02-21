import DiagnosisFlow from '@/features/diagnosis/components/DiagnosisFlow';

export default function DiagnosisPage() {
  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-start p-4"
      style={{
        backgroundColor: '#F0F380',
        backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="flex w-full flex-1 flex-col items-center">
        <DiagnosisFlow />
      </div>
    </div>
  );
}
