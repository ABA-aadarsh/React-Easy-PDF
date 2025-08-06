export default function Loader({ isLoading, progress }: { isLoading: boolean; progress?: number }) {
    if (!isLoading) return null;
    return (
        <div style={{
            height:'5px',
            width: `${progress ? progress : 80}%`,
            borderRadius: '5px',
            borderTopLeftRadius: '0px',
            borderBottomLeftRadius: '0px',
            backgroundColor: '#0a7bd7ff',
        }}>
        </div>
    )
}   