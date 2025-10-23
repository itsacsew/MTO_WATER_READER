import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
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
    paymentStatus: 'Paid' | 'Pending';
    processedBy: string;
    timestamp: string;
}

const Page = () => {
    const [excelData, setExcelData] = useState<ExcelData[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
    const [selectedConsumer, setSelectedConsumer] = useState<ExcelData | null>(null);
    const [selectedPaymentHistory, setSelectedPaymentHistory] = useState<PaymentRecord[]>([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setRefreshing(true);
        try {
            // Load Excel data
            const excelDataString = await AsyncStorage.getItem('excelData');
            if (excelDataString) {
                const parsedData: ExcelData[] = JSON.parse(excelDataString);
                setExcelData(parsedData);
            }

            // Load payment records
            const paymentRecordsString = await AsyncStorage.getItem('paymentRecords');
            if (paymentRecordsString) {
                const parsedPayments: PaymentRecord[] = JSON.parse(paymentRecordsString);
                setPaymentRecords(parsedPayments);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setRefreshing(false);
        }
    };

    const handleViewDetails = (consumer: ExcelData) => {
        setSelectedConsumer(consumer);
        setShowDetailsModal(true);
    };

    const handleViewPaymentHistory = (consumer: ExcelData) => {
        const consumerPayments = paymentRecords.filter(
            payment => payment.wsin === consumer.WSIN && payment.consumerName === consumer.ConsumerName
        );
        setSelectedPaymentHistory(consumerPayments);
        setShowPaymentHistoryModal(true);
    };

    const getStatusColor = (status: string) => {
        if (status === 'Paid') return '#4CAF50';
        if (status === 'Unpaid') return '#FF0000'; // Red for Unpaid
        return '#FF9800'; // Orange for Pending
    };

    // Update the getLatestPaymentStatus function
    const getLatestPaymentStatus = (consumer: ExcelData) => {
        return consumer.PaymentStatus || 'Pending';
    };

    // Fixed: Added null check
    const hasPaymentRecords = (consumer: ExcelData | null) => {
        if (!consumer) return false;
        return paymentRecords.some(
            payment => payment.wsin === consumer.WSIN && payment.consumerName === consumer.ConsumerName
        );
    };

    const formatCurrency = (amount: string) => {
        return `₱${parseFloat(amount || '0').toFixed(2)}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Consumer Records</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
                    <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
                <View style={styles.wsinCell}><Text style={styles.headerCell}>WSIN</Text></View>
                <View style={styles.nameCell}><Text style={styles.headerCell}>Consumer Name</Text></View>
                <View style={styles.locationCell}><Text style={styles.headerCell}>Location</Text></View>
                <View style={styles.typeCell}><Text style={styles.headerCell}>Type</Text></View>
                <View style={styles.typeCell}><Text style={styles.headerCell}></Text></View>
                <View style={styles.actionsCell}><Text style={styles.headerCell}>          Actions</Text></View>
            </View>

            {/* Table Rows */}
            <ScrollView style={styles.tableContainer}>
                {excelData.map((consumer, index) => (
                    <View key={consumer.WSIN + index} style={styles.tableRow}>
                        <View style={styles.wsinCell}><Text style={styles.cell}>{consumer.WSIN}</Text></View>
                        <View style={styles.nameCell}><Text style={styles.cell} numberOfLines={1}>{consumer.ConsumerName}</Text></View>
                        <View style={styles.locationCell}><Text style={styles.cell} numberOfLines={1}>{consumer.Location}</Text></View>
                        <View style={styles.typeCell}><Text style={styles.cell}>{consumer.Type}</Text></View>
                        <View style={styles.statusCell}>

                        </View>
                        <View style={styles.actionsCell}>
                            {hasPaymentRecords(consumer) && (
                                <TouchableOpacity
                                    style={styles.historyButton}
                                    onPress={() => handleViewPaymentHistory(consumer)}
                                >
                                    <Text style={styles.historyButtonText}>History</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                {excelData.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No consumer records found</Text>
                        <Text style={styles.emptyStateSubText}>Import an Excel file first in the Import tab</Text>
                    </View>
                )}
            </ScrollView>

            {/* Consumer Details Modal */}
            <Modal
                visible={showDetailsModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDetailsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Consumer Details - {selectedConsumer?.ConsumerName}</Text>

                        <ScrollView style={styles.detailsScrollView}>
                            <View style={styles.detailsContainer}>
                                {/* Basic Information */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Basic Information</Text>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>WSIN:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.WSIN}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Consumer Name:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.ConsumerName}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Location:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.Location}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Type:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.Type}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Consumer Type:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.ConsumerType}</Text>
                                    </View>
                                </View>

                                {/* Billing Information */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Billing Information</Text>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Year/Month:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.Year}/{selectedConsumer?.Month}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Status:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.Status}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Previous Reading:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.PreviousReading}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Present Reading:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.PresentReading || 'Not recorded'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Consumption:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.Consumption || 'Not calculated'} m³</Text>
                                    </View>
                                </View>

                                {/* Payment Information */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>Payment Information</Text>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Water Charge:</Text>
                                        <Text style={styles.detailValue}>{formatCurrency(selectedConsumer?.WaterCharge || '0')}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Surcharge:</Text>
                                        <Text style={styles.detailValue}>{formatCurrency(selectedConsumer?.Surcharge || '0')}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Overall Total:</Text>
                                        <Text style={styles.detailValue}>{formatCurrency(selectedConsumer?.OverallTotal || '0')}</Text>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Official Receipt:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.OfficialReceipt || 'Not issued'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Processed By:</Text>
                                        <Text style={styles.detailValue}>{selectedConsumer?.ProcessedBy || 'Not processed'}</Text>
                                    </View>
                                </View>

                                {/* Last Updated */}
                                {selectedConsumer?.PresentReading && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>Last Update</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Updated Data:</Text>
                                            <Text style={[styles.detailValue, { color: '#4CAF50' }]}>
                                                From Reader Tab
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.secondaryButton]}
                                onPress={() => setShowDetailsModal(false)}
                            >
                                <Text style={styles.secondaryButtonText}>Close</Text>
                            </TouchableOpacity>
                            {hasPaymentRecords(selectedConsumer) && (
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.primaryButton]}
                                    onPress={() => {
                                        setShowDetailsModal(false);
                                        if (selectedConsumer) {
                                            handleViewPaymentHistory(selectedConsumer);
                                        }
                                    }}
                                >
                                    <Text style={styles.primaryButtonText}>View Payment History</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Payment History Modal */}
            <Modal
                visible={showPaymentHistoryModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentHistoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.historyModalContent]}>
                        <Text style={styles.modalHeader}>
                            Payment History - {selectedPaymentHistory[0]?.consumerName}
                        </Text>

                        <ScrollView style={styles.historyScrollView} horizontal={true}>
                            <View>
                                {/* Payment History Table Header */}
                                <View style={styles.historyTableHeader}>
                                    <View style={styles.historyYearMonthCell}><Text style={styles.historyHeaderCell}>Year/Month</Text></View>
                                    <View style={styles.historyReadingCell}><Text style={styles.historyHeaderCell}>Previous</Text></View>
                                    <View style={styles.historyReadingCell}><Text style={styles.historyHeaderCell}>Present</Text></View>
                                    <View style={styles.historyConsumptionCell}><Text style={styles.historyHeaderCell}>Consumption</Text></View>
                                    <View style={styles.historyChargeCell}><Text style={styles.historyHeaderCell}>Water Charge</Text></View>
                                    <View style={styles.historyChargeCell}><Text style={styles.historyHeaderCell}>Surcharge</Text></View>
                                    <View style={styles.historyTotalCell}><Text style={styles.historyHeaderCell}>Total</Text></View>
                                    <View style={styles.historyStatusCell}><Text style={styles.historyHeaderCell}>Status</Text></View>
                                    <View style={styles.historyDateCell}><Text style={styles.historyHeaderCell}>Processed Date</Text></View>
                                </View>

                                {/* Payment History Table Rows */}
                                {selectedPaymentHistory.map((payment) => (
                                    <View key={payment.id} style={styles.historyTableRow}>
                                        <View style={styles.historyYearMonthCell}><Text style={styles.historyCell}>{payment.year}/{payment.month}</Text></View>
                                        <View style={styles.historyReadingCell}><Text style={styles.historyCell}>{payment.previousReading}</Text></View>
                                        <View style={styles.historyReadingCell}><Text style={styles.historyCell}>{payment.presentReading}</Text></View>
                                        <View style={styles.historyConsumptionCell}><Text style={styles.historyCell}>{payment.waterConsumption} m³</Text></View>
                                        <View style={styles.historyChargeCell}><Text style={styles.historyCell}>{formatCurrency(payment.waterCharge)}</Text></View>
                                        <View style={styles.historyChargeCell}><Text style={styles.historyCell}>{formatCurrency(payment.surcharge)}</Text></View>
                                        <View style={styles.historyTotalCell}><Text style={styles.historyCell}>{formatCurrency(payment.overallTotal)}</Text></View>
                                        <View style={styles.historyStatusCell}>
                                            <Text style={[styles.historyCell, { color: getStatusColor(payment.paymentStatus) }]}>
                                                {payment.paymentStatus}
                                            </Text>
                                        </View>
                                        <View style={styles.historyDateCell}>
                                            <Text style={styles.historyCell}>
                                                {new Date(payment.timestamp).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.primaryButton]}
                            onPress={() => setShowPaymentHistoryModal(false)}
                        >
                            <Text style={styles.primaryButtonText}>Close History</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default Page

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    refreshButton: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 6,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Main Table Styles
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        padding: 12,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    headerCell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    tableContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        padding: 12,
        alignItems: 'center',
    },
    cell: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    // Cell widths for main table
    wsinCell: {
        width: 60,
        alignItems: 'center',
    },
    nameCell: {
        width: 90,
        alignItems: 'center',
    },
    locationCell: {
        width: 70,
        alignItems: 'center',
    },
    typeCell: {
        width: 70,
        alignItems: 'center',
    },
    statusCell: {
        width: 80,
        alignItems: 'center',
    },
    actionsCell: {
        width: 120,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    viewButton: {
        backgroundColor: '#007AFF',
        padding: 4,
        borderRadius: 4,
        minWidth: 50,
        alignItems: 'center',
    },
    viewButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    historyButton: {
        backgroundColor: '#3F48CC',
        padding: 4,
        borderRadius: 10,
        minWidth: 80,
        alignItems: 'center',
    },
    historyButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        color: '#666',
        fontSize: 16,
        marginBottom: 10,
    },
    emptyStateSubText: {
        color: '#999',
        fontSize: 14,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '95%',
        maxHeight: '80%',
    },
    historyModalContent: {
        width: '98%',
        maxHeight: '85%',
    },
    modalHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    detailsScrollView: {
        maxHeight: 500,
    },
    historyScrollView: {
        maxHeight: 400,
    },
    detailsContainer: {
        padding: 10,
    },
    detailSection: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
    },
    detailSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#007AFF',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        textAlign: 'right',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 10,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    secondaryButtonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
    },
    // Payment History Table Styles
    historyTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 4,
        marginBottom: 5,
    },
    historyHeaderCell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'center',
    },
    historyTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        padding: 8,
        alignItems: 'center',
    },
    historyCell: {
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
    },
    // Payment History Cell widths
    historyYearMonthCell: { width: 80, alignItems: 'center' },
    historyReadingCell: { width: 60, alignItems: 'center' },
    historyConsumptionCell: { width: 70, alignItems: 'center' },
    historyChargeCell: { width: 70, alignItems: 'center' },
    historyTotalCell: { width: 70, alignItems: 'center' },
    historyStatusCell: { width: 60, alignItems: 'center' },
    historyDateCell: { width: 90, alignItems: 'center' },
})