import { Card, Typography, Flex } from 'antd'
import '../index.css'

const { Title, Text } = Typography
const HeadNavbar = ({ title, icon, description }) => {

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  }

  const user = getUser()
  const username = user?.username || 'User'

  const currentHour = new Date().getHours()

  let greeting = ''
  let emoji = ''

  if (currentHour >= 5 && currentHour < 12) {
    greeting = 'Selamat pagi'
    emoji = '🌅'
  } else if (currentHour >= 12 && currentHour < 15) {
    greeting = 'Selamat siang'
    emoji = '☀️'
  } else if (currentHour >= 15 && currentHour < 18) {
    greeting = 'Selamat sore'
    emoji = '🌤️'
  } else {
    greeting = 'Selamat malam'
    emoji = '🌙'
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

          <Title level={2} className="greeting-title">
            Hallo, {username} {emoji}
          </Title>

          <Text className="greeting-description">
            Semoga harimu menyenangkan dan produktif hari ini.
            Jangan lupa menabung dan berinvestasi untuk masa depan. 💰
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