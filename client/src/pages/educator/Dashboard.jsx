import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext';
import { dummyDashboardData } from '../../assets/assets';
import Loading from '../../components/student/Loading';

const Dashboard = () => {

  const {currency} = useContext(AppContext)
  const [dashboardData, setDashboardData] = useState(null)

  const fetchDashboarddData = async ()=>{
    setDashboardData(dummyDashboardData)
  }

  useEffect(()=>{
      fetchDashboarddData()
  },[])

  return dashboardData ? (
    <div className='min-h-screen flex flex-col items-start justify-between gap-8
    md:p-8 md:pb-0 p-4 pt-8 pb-0'>
      <div className='space-y-5'>
        <div className='flex flex-wrap gap-5 items-center'>
          
        </div>
      </div>
        
    </div>
  ) : <Loading/>
}

export default Dashboard
