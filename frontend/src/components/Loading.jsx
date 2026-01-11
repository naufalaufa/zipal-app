import { Spin } from "antd"

const Loading = () => {
  return (
   <>
    <div 
      style={{display : 'grid' , placeContent : 'center' , placeItems : 'center' , height : '100vh' , width : '100vw'}}>
         <Spin/>
     </div>
   </>
  )
}

export default Loading
