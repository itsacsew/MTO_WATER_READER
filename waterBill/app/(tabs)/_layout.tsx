import React from 'react'
import { Tabs } from 'expo-router'
import { TabBar } from '@/components/TabBar'

const TabLayout = () => {
    return (
        <Tabs
            tabBar={props => <TabBar {...props} />}
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#03A5FF',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Tabs.Screen name="Reader" options={{ title: "Reader" }} />
            <Tabs.Screen name="Database" options={{ title: "Database" }} />
            <Tabs.Screen name="Import" options={{ title: "Import" }} />
            <Tabs.Screen name="Export" options={{ title: "Export" }} />
        </Tabs>
    )
}

export default TabLayout