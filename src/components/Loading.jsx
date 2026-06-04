import { HashLoader } from 'react-spinners';

const Loading = ({ size = 50, tip = 'Đang tải...', text = 'light' }) => {
    return (
        <div className="flex flex-col items-center">
            <HashLoader loading={true} color="#e30713" size={size} speedMultiplier={1} />
            <div
                className="mt-4 text-white/80 text-[16px]"
                style={{
                    color: text === 'dark' ? '#555' : '#fff',
                }}
            >
                {tip}
            </div>
        </div>
    );
};

export default Loading;
