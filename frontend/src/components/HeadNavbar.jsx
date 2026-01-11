const HeadNavbar = ({title , icon , description}) => {
  return (
    <div>
      <div style={{display : 'flex' , alignItems : 'center' , gap : '10px'}}>
          <h2>{title}</h2>
          <span>{icon}</span>
      </div>
        <p style={{marginBottom : '20px' , marginTop : '20px'}}>{description}</p>
    </div>
  )
}

export default HeadNavbar
