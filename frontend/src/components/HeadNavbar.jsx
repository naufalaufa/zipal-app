import { Card, Typography, Flex } from 'antd'
import '../index.css'
const { Title, Text } = Typography

const HeadNavbar = ({ title, icon, description }) => {
  const getUser = () => {
    try {
      const storedUser = sessionStorage.getItem('user')
      return storedUser ? JSON.parse(storedUser) : null
    } catch (error) {
      console.error('Gagal membaca user dari sessionStorage:', error)
      return null
    }
  }

  const user = getUser()
  const username = user?.username || 'User'
  const normalizedUsername = username.trim().toLowerCase()
  const currentHour = new Date().getHours()

  let greeting = ''
  let emoji = ''
  let timePeriod = ''

  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Selamat pagi'
    emoji = '🌅'
    timePeriod = 'pagi'
  } else if (currentHour >= 12 && currentHour < 15) {
    greeting = 'Selamat siang'
    emoji = '☀️'
    timePeriod = 'siang'
  } else if (currentHour >= 15 && currentHour < 18) {
    greeting = 'Selamat sore'
    emoji = '🌤️'
    timePeriod = 'sore'
  } else {
    greeting = 'Selamat malam'
    emoji = '🌙'
    timePeriod = 'malam'
  }



  const adminDescription = 'Semoga harimu menyenangkan dan produktif hari ini. Jangan lupa menabung dan berinvestasi untuk masa depan. 💰'

  const zihraMessages = {
    pagi: 'Semangat ya, Zihra Angelina cantik Jalani hari ini dengan senyum dan tetap semangat dalam setiap aktivitasnya. Jangan lupa selalu sayang sama Naufal Aufa Rifqi, karena hubungan kita juga perlu investasi, investasi waktu, perhatian, kesetiaan, dan cinta. ❤️📈',
    siang: 'Semangat terus ya, Zihra Angelina cantik  Jangan lupa istirahat di tengah kesibukanmu. Tetap jaga kesehatan dan jangan lupa sayang sama Naufal Aufa Rifqi. Kalau uang perlu ditabung untuk masa depan, hubungan kita juga perlu dijaga supaya nilainya terus bertambah. ❤️📈',
    sore: 'Semangat ya, Zihra Angelina cantik  Hari sudah mulai sore, semoga semua aktivitas hari ini berjalan dengan baik. Jangan lupa ada Naufal Aufa Rifqi yang selalu sayang sama kamu. Kita boleh belajar investasi uang, tapi jangan lupa terus investasi waktu dan perhatian untuk hubungan kita juga. ❤️📊',
    malam: 'Selamat malam, Zihra Angelina cantik  Setelah menjalani hari yang panjang, jangan lupa istirahat yang cukup ya. Terus semangat dan terus sayang sama Naufal Aufa Rifqi. Semoga tabungan kita bertambah, investasi kita berkembang, dan hubungan kita terus langgeng sampai masa depan. ❤️📈'
  }



  const naufalMessages = {
    pagi: 'Semangat ya, Naufal Aufa Rifqi sayang Jalani hari ini dengan semangat dan jangan menyerah dalam mengejar cita-cita. Jangan lupa selalu sayang sama Zihra Angelina, karena investasi terbaik bukan cuma yang menghasilkan uang, tapi juga seseorang yang ingin kita ajak membangun masa depan. 💕📈',
    siang: 'Semangat terus ya, Naufal Aufa Rifqi sayang  Jangan terlalu capek dalam menjalani aktivitas hari ini. Tetap bekerja, belajar, menabung, dan jangan lupa kasih perhatian ke Zihra Angelina. Karena keuangan butuh dikelola, begitu juga hubungan kita. 💕',
    sore: 'Semangat ya, Naufal Aufa Rifqi sayang Hari sudah mulai sore, jangan lupa istirahat. Terus berusaha membangun masa depan dan jangan lupa sayang sama Zihra Angelina. Semoga bukan cuma saldo yang terus bertambah, tapi juga rasa sayang kita setiap harinya. 📈💕',
    malam: 'Selamat malam, Naufal Aufa Rifqi sayang Istirahat yang cukup setelah melewati hari ini ya. Kita sedang membangun masa depan sedikit demi sedikit, seperti investasi jangka panjang. Semoga usaha, tabungan, dan rasa sayang kita memberikan return terbaik di masa depan bersama Zihra Angelina. 💕📈'
  }


  let greetingDescription = adminDescription

  if (normalizedUsername.startsWith('zihra')) {
    greetingDescription = zihraMessages[timePeriod]
  }


  else if (normalizedUsername.startsWith('naufal')) {
    greetingDescription = naufalMessages[timePeriod]
  }

  return (
    <div className="head-navbar">

      <Card
        bordered={false}
        className="greeting-banner"
        styles={{
          body: {
            padding: 0
          }
        }}
      >

        <div className="greeting-decoration greeting-decoration-one" />

        <div className="greeting-decoration greeting-decoration-two" />

        <div className="greeting-content">

          <Text className="greeting-label">
            {greeting} 👋
          </Text>

          <Title
            level={2}
            className="greeting-title"
          >
            Hallo, {username} {emoji}
          </Title>

          <Text className="greeting-description">
            {greetingDescription}
          </Text>

        </div>

      </Card>


      <Flex
        align="center"
        gap={10}
        wrap="wrap"
        className="page-header"
      >

        <Title
          level={2}
          className="page-title"
        >
          {title}
        </Title>

        <span className="page-icon">
          {icon}
        </span>

      </Flex>


      <Text
        type="secondary"
        className="page-description"
      >
        {description}
      </Text>

    </div>
  )
}

export default HeadNavbar
