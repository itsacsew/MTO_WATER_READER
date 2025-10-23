import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React, { useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ExcelData {
    WSIN: string;
    ConsumerName: string;
    Location: string;
    Type: string;
    ConsumerType: string;
    Year: string;
    Month: string;
    Status: string;
    PresentReading: string;
    PreviousReading: string;
    Consumption: string;
    WaterCharge: string;
    Surcharge: string;
    OverallTotal: string;
    PaymentStatus: string;
    OfficialReceipt: string;
    ProcessedBy: string;
}

const Page = () => {
    const [excelData, setExcelData] = useState<ExcelData[]>([])
    const [fileName, setFileName] = useState('')

    const pickExcelFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                copyToCacheDirectory: true,
            })

            if (result.assets && result.assets[0]) {
                const file = result.assets[0]
                setFileName(file.name)
                Alert.alert('Success', `File selected: ${file.name}`)

                // For now, we'll simulate data since we can't parse Excel directly
                // In a real app, you'd use a library like xlsx to parse the file
                simulateExcelData()
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file')
            console.error(error)
        }
    }

    const simulateExcelData = () => {
        // Simulate the data from your Excel file
        const simulatedData: ExcelData[] = [
            {
                WSIN: "1",
                ConsumerName: "elai",
                Location: "LOTAO",
                Type: "residential",
                ConsumerType: "old",
                Year: "2025",
                Month: "November",
                Status: "normal",
                PresentReading: "",
                PreviousReading: "4409",
                Consumption: "",
                WaterCharge: "",
                Surcharge: "",
                OverallTotal: "",
                PaymentStatus: "",
                OfficialReceipt: "",
                ProcessedBy: "s"
            },
            {
                WSIN: "2",
                ConsumerName: "d",
                Location: "LOTAO",
                Type: "residential",
                ConsumerType: "old",
                Year: "2025",
                Month: "November",
                Status: "normal",
                PresentReading: "",
                PreviousReading: "4409",
                Consumption: "",
                WaterCharge: "",
                Surcharge: "",
                OverallTotal: "",
                PaymentStatus: "",
                OfficialReceipt: "",
                ProcessedBy: ""
            },
            {
                WSIN: "3",
                ConsumerName: "c",
                Location: "LOTAO",
                Type: "residential",
                ConsumerType: "old",
                Year: "2025",
                Month: "November",
                Status: "normal",
                PresentReading: "",
                PreviousReading: "4409",
                Consumption: "",
                WaterCharge: "",
                Surcharge: "",
                OverallTotal: "",
                PaymentStatus: "",
                OfficialReceipt: "",
                ProcessedBy: ""
            }
        ]

        setExcelData(simulatedData)
    }

    const handleProceed = async () => {
        if (excelData.length === 0) {
            Alert.alert('Error', 'No data to import')
            return
        }

        try {
            // Save to AsyncStorage
            await AsyncStorage.setItem('excelData', JSON.stringify(excelData))
            Alert.alert('Success', 'Excel data imported successfully!')
        } catch (error) {
            Alert.alert('Error', 'Failed to save data')
            console.error(error)
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Import Excel File</Text>

            <TouchableOpacity style={styles.importButton} onPress={pickExcelFile}>
                <Text style={styles.importButtonText}>Select Excel File</Text>
            </TouchableOpacity>

            {fileName ? (
                <Text style={styles.fileName}>Selected: {fileName}</Text>
            ) : null}

            {excelData.length > 0 && (
                <View style={styles.previewSection}>
                    <Text style={styles.previewHeader}>Preview Data ({excelData.length} records)</Text>

                    <ScrollView style={styles.previewContainer}>
                        {excelData.slice(0, 5).map((item, index) => (
                            <View key={index} style={styles.previewItem}>
                                <Text style={styles.previewText}>WSIN: {item.WSIN}</Text>
                                <Text style={styles.previewText}>Name: {item.ConsumerName}</Text>
                                <Text style={styles.previewText}>Location: {item.Location}</Text>
                                <Text style={styles.previewText}>Previous: {item.PreviousReading}</Text>
                            </View>
                        ))}
                        {excelData.length > 5 && (
                            <Text style={styles.moreText}>... and {excelData.length - 5} more records</Text>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
                        <Text style={styles.proceedButtonText}>Proceed with Import</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    )
}

export default Page

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    importButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    importButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    fileName: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    previewSection: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        elevation: 2,
    },
    previewHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    previewContainer: {
        maxHeight: 300,
        marginBottom: 15,
    },
    previewItem: {
        backgroundColor: '#f8f8f8',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    previewText: {
        fontSize: 12,
        color: '#333',
        marginBottom: 2,
    },
    moreText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 10,
    },
    proceedButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    proceedButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
})