import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform
} from 'react-native'
import React, { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

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

interface PaymentRecord {
    id: string;
    wsin: string;
    consumerName: string;
    location: string;
    serviceType: string;
    consumerType: string;
    year: string;
    month: string;
    previousReading: string;
    presentReading: string;
    waterConsumption: string;
    waterCharge: string;
    surcharge: string;
    overallTotal: string;
    paymentStatus: 'Paid' | 'Pending' | 'Unpaid';
    processedBy: string;
    timestamp: string;
}

const Page = () => {
    const [excelData, setExcelData] = useState<ExcelData[]>([])
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
    const [isExporting, setIsExporting] = useState(false)
    const [exportedData, setExportedData] = useState<ExcelData[]>([])

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Load Excel data
            const excelDataString = await AsyncStorage.getItem('excelData')
            if (excelDataString) {
                const parsedData: ExcelData[] = JSON.parse(excelDataString)
                setExcelData(parsedData)
                setExportedData(parsedData)
            }

            // Load payment records
            const paymentRecordsString = await AsyncStorage.getItem('paymentRecords')
            if (paymentRecordsString) {
                const parsedPayments: PaymentRecord[] = JSON.parse(paymentRecordsString)
                setPaymentRecords(parsedPayments)
            }
        } catch (error) {
            console.error('Error loading data:', error)
            Alert.alert('Error', 'Failed to load data')
        }
    }

    const prepareExportData = (): ExcelData[] => {
        // Start with the original Excel data
        const exportData = [...excelData]

        // Update the data with latest readings and payments from paymentRecords
        paymentRecords.forEach(payment => {
            const existingRecordIndex = exportData.findIndex(
                item =>
                    item.WSIN === payment.wsin &&
                    item.ConsumerName === payment.consumerName &&
                    item.Year === payment.year &&
                    item.Month === payment.month
            )

            if (existingRecordIndex !== -1) {
                // Update existing record with latest data
                exportData[existingRecordIndex] = {
                    ...exportData[existingRecordIndex],
                    PresentReading: payment.presentReading,
                    PreviousReading: payment.previousReading,
                    Consumption: payment.waterConsumption,
                    WaterCharge: payment.waterCharge,
                    Surcharge: payment.surcharge,
                    OverallTotal: payment.overallTotal,
                    PaymentStatus: payment.paymentStatus,
                    ProcessedBy: payment.processedBy,
                    // Keep original values if not updated
                    Status: exportData[existingRecordIndex].Status || 'normal',
                    OfficialReceipt: exportData[existingRecordIndex].OfficialReceipt || '',
                    ConsumerType: exportData[existingRecordIndex].ConsumerType,
                    Type: exportData[existingRecordIndex].Type,
                    Location: exportData[existingRecordIndex].Location
                }
            } else {
                // Create new record if not found in original data
                const newRecord: ExcelData = {
                    WSIN: payment.wsin,
                    ConsumerName: payment.consumerName,
                    Location: payment.location,
                    Type: payment.serviceType,
                    ConsumerType: payment.consumerType,
                    Year: payment.year,
                    Month: payment.month,
                    Status: 'normal',
                    PresentReading: payment.presentReading,
                    PreviousReading: payment.previousReading,
                    Consumption: payment.waterConsumption,
                    WaterCharge: payment.waterCharge,
                    Surcharge: payment.surcharge,
                    OverallTotal: payment.overallTotal,
                    PaymentStatus: payment.paymentStatus,
                    OfficialReceipt: '',
                    ProcessedBy: payment.processedBy
                }
                exportData.push(newRecord)
            }
        })

        return exportData
    }

    const convertToCSV = (data: ExcelData[]): string => {
        if (data.length === 0) return ''

        // Define headers in the same order as imported Excel
        const headers = [
            'WSIN',
            'ConsumerName',
            'Location',
            'Type',
            'ConsumerType',
            'Year',
            'Month',
            'Status',
            'PresentReading',
            'PreviousReading',
            'Consumption',
            'WaterCharge',
            'Surcharge',
            'OverallTotal',
            'PaymentStatus',
            'OfficialReceipt',
            'ProcessedBy'
        ]

        // Create CSV header
        let csv = headers.join(',') + '\n'

        // Add data rows
        data.forEach(item => {
            const row = headers.map(header => {
                const value = item[header as keyof ExcelData] || ''
                // Escape commas and quotes in values
                const escapedValue = String(value).replace(/"/g, '""')
                return `"${escapedValue}"`
            })
            csv += row.join(',') + '\n'
        })

        return csv
    }

    const exportToExcel = async () => {
        if (excelData.length === 0 && paymentRecords.length === 0) {
            Alert.alert('No Data', 'There is no data to export. Please import data first.')
            return
        }

        setIsExporting(true)

        try {
            // Prepare data for export
            const exportData = prepareExportData()
            setExportedData(exportData)

            // Convert to CSV
            const csvData = convertToCSV(exportData)

            // Create filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0]
            const filename = `water_billing_data_${timestamp}.csv`

            // Define file path - FIXED: Use cacheDirectory instead of documentDirectory
            const fileUri = `${FileSystem.cacheDirectory}${filename}`

            // Write file - FIXED: Remove EncodingType, just pass the string
            await FileSystem.writeAsStringAsync(fileUri, csvData)

            // Share the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export Water Billing Data',
                    UTI: 'public.comma-separated-values-text'
                })
            } else {
                Alert.alert(
                    'Export Successful',
                    `File saved as: ${filename}\n\nLocation: ${fileUri}`,
                    [{ text: 'OK' }]
                )
            }

            Alert.alert('Success', `Exported ${exportData.length} records successfully!`)

        } catch (error) {
            console.error('Export error:', error)
            Alert.alert('Error', 'Failed to export data. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    const formatCurrency = (amount: string) => {
        return `₱${parseFloat(amount || '0').toFixed(2)}`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid': return '#4CAF50'
            case 'Unpaid': return '#FF0000'
            case 'Pending': return '#FF9800'
            default: return '#666'
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Export Data to Excel</Text>

            {/* Statistics Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{excelData.length}</Text>
                    <Text style={styles.statLabel}>Total Consumers</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{paymentRecords.length}</Text>
                    <Text style={styles.statLabel}>Payment Records</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                        {paymentRecords.filter(p => p.paymentStatus === 'Paid').length}
                    </Text>
                    <Text style={styles.statLabel}>Paid Records</Text>
                </View>
            </View>

            {/* Export Button */}
            <TouchableOpacity
                style={[styles.exportButton, isExporting && styles.disabledButton]}
                onPress={exportToExcel}
                disabled={isExporting}
            >
                <Text style={styles.exportButtonText}>
                    {isExporting ? 'Exporting...' : '📊 Export to Excel'}
                </Text>
            </TouchableOpacity>

            {/* Data Preview */}
            {exportedData.length > 0 && (
                <View style={styles.previewSection}>
                    <Text style={styles.previewHeader}>
                        Data to be Exported ({exportedData.length} records)
                    </Text>

                    <ScrollView
                        style={styles.previewContainer}
                        horizontal={true}
                    >
                        <View>
                            {/* Table Header */}
                            <View style={styles.previewTableHeader}>
                                <View style={styles.previewWsinCell}><Text style={styles.previewHeaderCell}>WSIN</Text></View>
                                <View style={styles.previewNameCell}><Text style={styles.previewHeaderCell}>Name</Text></View>
                                <View style={styles.previewLocationCell}><Text style={styles.previewHeaderCell}>Location</Text></View>
                                <View style={styles.previewYearMonthCell}><Text style={styles.previewHeaderCell}>Year/Month</Text></View>
                                <View style={styles.previewReadingCell}><Text style={styles.previewHeaderCell}>Present</Text></View>
                                <View style={styles.previewReadingCell}><Text style={styles.previewHeaderCell}>Previous</Text></View>
                                <View style={styles.previewConsumptionCell}><Text style={styles.previewHeaderCell}>Consumption</Text></View>
                                <View style={styles.previewChargeCell}><Text style={styles.previewHeaderCell}>Charge</Text></View>
                                <View style={styles.previewStatusCell}><Text style={styles.previewHeaderCell}>Status</Text></View>
                            </View>

                            {/* Table Rows */}
                            {exportedData.slice(0, 10).map((item, index) => (
                                <View key={index} style={styles.previewTableRow}>
                                    <View style={styles.previewWsinCell}><Text style={styles.previewCell}>{item.WSIN}</Text></View>
                                    <View style={styles.previewNameCell}><Text style={styles.previewCell} numberOfLines={1}>{item.ConsumerName}</Text></View>
                                    <View style={styles.previewLocationCell}><Text style={styles.previewCell} numberOfLines={1}>{item.Location}</Text></View>
                                    <View style={styles.previewYearMonthCell}><Text style={styles.previewCell}>{item.Year}/{item.Month}</Text></View>
                                    <View style={styles.previewReadingCell}><Text style={styles.previewCell}>{item.PresentReading || '-'}</Text></View>
                                    <View style={styles.previewReadingCell}><Text style={styles.previewCell}>{item.PreviousReading}</Text></View>
                                    <View style={styles.previewConsumptionCell}><Text style={styles.previewCell}>{item.Consumption || '-'} m³</Text></View>
                                    <View style={styles.previewChargeCell}><Text style={styles.previewCell}>{formatCurrency(item.WaterCharge)}</Text></View>
                                    <View style={styles.previewStatusCell}>
                                        <Text style={[styles.previewCell, { color: getStatusColor(item.PaymentStatus) }]}>
                                            {item.PaymentStatus || 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {exportedData.length > 10 && (
                        <Text style={styles.moreText}>
                            ... and {exportedData.length - 10} more records will be exported
                        </Text>
                    )}

                    <Text style={styles.exportInfo}>
                        💡 The exported Excel file will maintain the same layout as your imported file with updated readings and payment status.
                    </Text>
                </View>
            )}

            {/* Instructions */}
            <View style={styles.instructionsSection}>
                <Text style={styles.instructionsHeader}>Export Instructions:</Text>
                <Text style={styles.instruction}>1. Data will be exported in CSV format (compatible with Excel)</Text>
                <Text style={styles.instruction}>2. File will include all consumer records with updated readings</Text>
                <Text style={styles.instruction}>3. Payment status will reflect latest updates from Reader tab</Text>
                <Text style={styles.instruction}>4. You can share the file via email or save to your device</Text>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadData}
            >
                <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
            </TouchableOpacity>
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
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    exportButton: {
        backgroundColor: '#28a745',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    exportButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    previewSection: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    previewHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    previewContainer: {
        maxHeight: 300,
        marginBottom: 10,
    },
    previewTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        padding: 10,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    previewHeaderCell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'center',
    },
    previewTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        padding: 10,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    previewCell: {
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
    },
    // Preview table cell widths
    previewWsinCell: { width: 50, alignItems: 'center' },
    previewNameCell: { width: 80, alignItems: 'center' },
    previewLocationCell: { width: 70, alignItems: 'center' },
    previewYearMonthCell: { width: 70, alignItems: 'center' },
    previewReadingCell: { width: 50, alignItems: 'center' },
    previewConsumptionCell: { width: 60, alignItems: 'center' },
    previewChargeCell: { width: 60, alignItems: 'center' },
    previewStatusCell: { width: 50, alignItems: 'center' },
    moreText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    exportInfo: {
        fontSize: 12,
        color: '#1565C0',
        textAlign: 'center',
        fontStyle: 'italic',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 6,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    instructionsSection: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    instructionsHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    instruction: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        paddingLeft: 10,
    },
    refreshButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
})