import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#10141b]">
      <Result
        status="403"
        title={<div className="text-white font-bold text-5xl">403</div>}
        subTitle={
          <div className="text-white text-xl">
            Xin lỗi, bạn không có quyền truy cập trang này.
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

export default Unauthorized;
