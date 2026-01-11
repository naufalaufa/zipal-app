import { HeadNavbar, TableHistory } from "../components"
import {HistoryOutlined} from '@ant-design/icons'

const History = () => {
  return (
    <div>
      <HeadNavbar 
        title="Zipal History"
        icon={<HistoryOutlined/>}
        description="Disini Statistik Data Uang Keluar Dan Masuk Dari Setiap User Zihra Dan Naufal"
      />
      <TableHistory/>
    </div>
  )
}

export default History
