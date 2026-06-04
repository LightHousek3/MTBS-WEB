import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#10141b]">
      <Result
        status="404"
        title={<div className="text-white font-bold text-5xl">404</div>}
        subTitle={
          <div className="text-white text-xl">
            Xin lỗi, trang bạn tìm kiếm không tồn tại.
          </div>
        }
        extra={
          <Button
            type="primary"
            className="w-full font-bold btn-primary !py-5 text-xl hover:scale-102"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
