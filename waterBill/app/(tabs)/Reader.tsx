import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal
} from 'react-native'
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
    paymentStatus: 'Unpaid' | 'Pending';
    processedBy: string;
    timestamp: string;
}

const Page = () => {
    // Form States
    const [serviceType, setServiceType] = useState<'residential' | 'commercial' | null>(null)
    const [consumerName, setConsumerName] = useState('')
    const [location, setLocation] = useState('')
    const [wsin, setWsin] = useState('')

    // Data from Excel
    const [excelData, setExcelData] = useState<ExcelData[]>([])
    const [filteredConsumers, setFilteredConsumers] = useState<ExcelData[]>([])

    // Dropdown States
    const [showConsumerDropdown, setShowConsumerDropdown] = useState(false)
    const [showLocationDropdown, setShowLocationDropdown] = useState(false)

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [previousReading, setPreviousReading] = useState('')
    const [presentReading, setPresentReading] = useState('')
    const [waterConsumption, setWaterConsumption] = useState('')
    const [waterCharge, setWaterCharge] = useState('')
    const [selectedConsumer, setSelectedConsumer] = useState<ExcelData | null>(null)

    // Location Options
    const locationOptions = [
        'LOTAO', 'CENTRAL', 'PALAWAN', 'CADUCAN', 'MORYO-MORYO',
        'HIGHWAY', 'BUSAY', 'DUWANGAN', 'SAN ROQUE', 'SAN ISIDRO', 'CALIAN'
    ]

    // Load Excel data on component mount
    useEffect(() => {
        loadExcelData()
    }, [])

    const loadExcelData = async () => {
        try {
            const data = await AsyncStorage.getItem('excelData')
            if (data) {
                const parsedData: ExcelData[] = JSON.parse(data)
                setExcelData(parsedData)
            }
        } catch (error) {
            console.error('Error loading Excel data:', error)
        }
    }

    // Search consumers by name and location
    const handleSearch = () => {
        if (consumerName.trim().length === 0 || location.trim().length === 0) {
            Alert.alert('Error', 'Please enter both consumer name and location')
            return
        }

        const filtered = excelData.filter(item =>
            item.ConsumerName.toLowerCase().includes(consumerName.toLowerCase()) &&
            item.Location === location
        )

        if (filtered.length === 0) {
            Alert.alert('No Results', 'No consumers found with that name and location')
            setFilteredConsumers([])
        } else {
            setFilteredConsumers(filtered)
            setShowConsumerDropdown(true)
        }
    }

    // Handle consumer selection
    const handleConsumerSelect = (consumer: ExcelData) => {
        setConsumerName(consumer.ConsumerName)
        setLocation(consumer.Location)
        setWsin(consumer.WSIN)
        setServiceType(consumer.Type as 'residential' | 'commercial')
        setPreviousReading(consumer.PreviousReading)
        setSelectedConsumer(consumer)
        setShowConsumerDropdown(false)
        setFilteredConsumers([])
    }

    // Handle location selection
    const handleLocationSelect = (loc: string) => {
        setLocation(loc)
        setShowLocationDropdown(false)
    }

    // Handle Next Button
    const handleNext = () => {
        if (!serviceType || !consumerName || !location || !wsin) {
            Alert.alert('Error', 'Please fill all required fields')
            return
        }

        if (!selectedConsumer) {
            Alert.alert('Error', 'Please search and select a valid consumer first')
            return
        }

        setShowPaymentModal(true)
    }

    // Handle Clear Button
    const handleClear = () => {
        setServiceType(null)
        setConsumerName('')
        setLocation('')
        setWsin('')
        setSelectedConsumer(null)
        setPreviousReading('')
        setPresentReading('')
        setWaterConsumption('')
        setWaterCharge('')
        setFilteredConsumers([])
    }

    // Calculate Water Consumption and Charge
    const calculateWaterData = () => {
        const prev = parseFloat(previousReading) || 0
        const pres = parseFloat(presentReading) || 0

        if (pres < prev) {
            Alert.alert('Error', 'Present reading cannot be less than previous reading')
            return
        }

        const consumption = pres - prev
        setWaterConsumption(consumption.toString())

        // Calculate water charge based on service type
        let charge = 0
        if (serviceType === 'residential') {
            if (consumption <= 5) {
                charge = 62.50
            } else {
                charge = 62.50 + ((consumption - 5) * 12.50)
            }
        } else if (serviceType === 'commercial') {
            if (consumption <= 5) {
                charge = 62.50
            } else {
                charge = 62.50 + ((consumption - 5) * 12.50)
            }
        }

        setWaterCharge(charge.toFixed(2))
    }

    // Handle Submit Payment
    const handleSubmitPayment = async () => {
        if (!presentReading) {
            Alert.alert('Error', 'Please enter present reading')
            return
        }

        try {
            if (!selectedConsumer) {
                throw new Error('No consumer selected')
            }

            // Calculate consumption and charge if not already calculated
            const prev = parseFloat(previousReading) || 0
            const pres = parseFloat(presentReading) || 0
            const consumption = pres - prev

            let charge = 0
            if (serviceType === 'residential') {
                if (consumption <= 5) {
                    charge = 62.50
                } else {
                    charge = 62.50 + ((consumption - 5) * 12.50)
                }
            } else if (serviceType === 'commercial') {
                if (consumption <= 5) {
                    charge = 62.50
                } else {
                    charge = 62.50 + ((consumption - 5) * 12.50)
                }
            }

            // Update the Excel data with new readings but keep PaymentStatus as 'Unpaid'
            const updatedExcelData = excelData.map(item => {
                if (item.WSIN === selectedConsumer.WSIN &&
                    item.ConsumerName === selectedConsumer.ConsumerName &&
                    item.Year === selectedConsumer.Year &&
                    item.Month === selectedConsumer.Month) {
                    return {
                        ...item,
                        PresentReading: presentReading,
                        Consumption: consumption.toString(),
                        WaterCharge: charge.toFixed(2),
                        OverallTotal: charge.toFixed(2),
                        PaymentStatus: 'Unpaid',
                        ProcessedBy: 'System Admin',
                    }
                }
                return item
            })

            // Save updated Excel data back to storage
            await AsyncStorage.setItem('excelData', JSON.stringify(updatedExcelData))
            setExcelData(updatedExcelData)

            // Also save to payment records for Database.tsx with 'Unpaid' status
            await savePaymentRecord(consumption.toString(), charge.toFixed(2))

            Alert.alert('Success', 'Reading information has been recorded! Payment status: Unpaid')
            setShowPaymentModal(false)
            handleClear()

        } catch (error) {
            Alert.alert('Error', 'Failed to save reading record')
            console.error(error)
        }
    }

    const savePaymentRecord = async (consumption: string, charge: string) => {
        if (!selectedConsumer) return

        const paymentRecord: PaymentRecord = {
            id: Date.now().toString(),
            wsin: selectedConsumer.WSIN,
            consumerName: selectedConsumer.ConsumerName,
            location: selectedConsumer.Location,
            serviceType: selectedConsumer.Type,
            consumerType: selectedConsumer.ConsumerType,
            year: selectedConsumer.Year,
            month: selectedConsumer.Month,
            previousReading: selectedConsumer.PreviousReading,
            presentReading: presentReading,
            waterConsumption: consumption,
            waterCharge: charge,
            surcharge: '0.00',
            overallTotal: charge,
            paymentStatus: 'Unpaid',
            processedBy: 'System Admin',
            timestamp: new Date().toISOString()
        }

        // Save to payment records (for Database.tsx)
        const existingRecords = await AsyncStorage.getItem('paymentRecords')
        const records: PaymentRecord[] = existingRecords ? JSON.parse(existingRecords) : []
        records.push(paymentRecord)
        await AsyncStorage.setItem('paymentRecords', JSON.stringify(records))
    }

    // Custom Dropdown Component
    const CustomDropdown = ({
        visible,
        items,
        onSelect,
        onClose,
        type = 'consumer'
    }: {
        visible: boolean;
        items: any[];
        onSelect: (item: any) => void;
        onClose: () => void;
        type?: 'consumer' | 'location';
    }) => {
        if (!visible) return null

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={onClose}
                    activeOpacity={1}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {type === 'consumer' ? 'Select Consumer' : 'Select Location'}
                        </Text>
                        <ScrollView style={styles.modalScrollView}>
                            {items.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.modalItem}
                                    onPress={() => onSelect(item)}
                                >
                                    <Text style={styles.modalItemText}>
                                        {type === 'consumer'
                                            ? `${item.ConsumerName} (WSIN: ${item.WSIN})`
                                            : item
                                        }
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={onClose}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.header}>Consumer Information</Text>

                {/* Service Type */}
                <View style={styles.section}>
                    <Text style={styles.label}>Service Type</Text>
                    <View style={styles.radioGroup}>
                        <TouchableOpacity
                            style={styles.radioButton}
                            onPress={() => setServiceType('residential')}
                        >
                            <View style={styles.radioCircle}>
                                {serviceType === 'residential' && <View style={styles.selectedRb} />}
                            </View>
                            <Text style={styles.radioLabel}>Residential</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.radioButton}
                            onPress={() => setServiceType('commercial')}
                        >
                            <View style={styles.radioCircle}>
                                {serviceType === 'commercial' && <View style={styles.selectedRb} />}
                            </View>
                            <Text style={styles.radioLabel}>Commercial</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Consumer Name */}
                <View style={styles.section}>
                    <Text style={styles.label}>Consumer Name</Text>
                    <TextInput
                        style={styles.textInput}
                        value={consumerName}
                        onChangeText={setConsumerName}
                        placeholder="Enter consumer name..."
                    />
                </View>

                {/* Location Dropdown */}
                <View style={styles.section}>
                    <Text style={styles.label}>Location</Text>
                    <TouchableOpacity
                        style={styles.dropdownTrigger}
                        onPress={() => setShowLocationDropdown(true)}
                    >
                        <Text style={location ? styles.dropdownText : styles.dropdownPlaceholder}>
                            {location || 'Select Location'}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomDropdown
                        visible={showLocationDropdown}
                        items={locationOptions}
                        onSelect={handleLocationSelect}
                        onClose={() => setShowLocationDropdown(false)}
                        type="location"
                    />
                </View>

                {/* Search Button */}
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                >
                    <Text style={styles.searchButtonText}>Search Consumer</Text>
                </TouchableOpacity>

                {/* WSIN (Auto-filled) */}
                {selectedConsumer && (
                    <View style={styles.section}>
                        <Text style={styles.label}>WSIN (Water Service Identification Number)</Text>
                        <TextInput
                            style={[styles.textInput, styles.disabledInput]}
                            value={wsin}
                            placeholder="Auto-filled from selection"
                            editable={false}
                        />
                    </View>
                )}

                {/* Previous Reading (Auto-filled) */}
                {selectedConsumer && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Previous Reading (Auto-filled)</Text>
                        <TextInput
                            style={[styles.textInput, styles.disabledInput]}
                            value={previousReading}
                            placeholder="Auto-filled from Excel"
                            editable={false}
                        />
                    </View>
                )}

                {/* Consumer Selection Dropdown */}
                <CustomDropdown
                    visible={showConsumerDropdown}
                    items={filteredConsumers}
                    onSelect={handleConsumerSelect}
                    onClose={() => setShowConsumerDropdown(false)}
                    type="consumer"
                />

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.nextButton, !selectedConsumer && styles.disabledButton]}
                        onPress={handleNext}
                        disabled={!selectedConsumer}
                    >
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={handleClear}
                    >
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacer */}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Payment Modal */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <View style={styles.paymentModalOverlay}>
                    <View style={styles.paymentModalContent}>
                        <Text style={styles.paymentHeader}>Record Water Reading</Text>

                        <ScrollView style={styles.paymentScrollView}>
                            {/* Previous Reading (Auto-filled) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Previous Reading (Auto-filled)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={previousReading}
                                    placeholder="Auto-filled from Excel"
                                    editable={false}
                                />
                            </View>

                            {/* Present Reading */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Present Reading *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={presentReading}
                                    onChangeText={setPresentReading}
                                    placeholder="Enter present reading"
                                    keyboardType="numeric"
                                    onBlur={calculateWaterData}
                                />
                            </View>

                            {/* Water Consumption (Auto-calculated) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Water Consumption (m³)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={waterConsumption}
                                    placeholder="Auto-calculated"
                                    editable={false}
                                />
                            </View>

                            {/* Water Charge (Auto-calculated) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Water Charge (₱)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={waterCharge}
                                    placeholder="Auto-calculated"
                                    editable={false}
                                />
                            </View>

                            {/* Payment Status Notice */}
                            <View style={styles.noticeSection}>
                                <Text style={styles.noticeText}>
                                    💡 Note: After recording the reading, the payment status will be set to "Unpaid"
                                </Text>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.paymentModalButtons}>
                            <TouchableOpacity
                                style={[styles.paymentButton, styles.cancelButton]}
                                onPress={() => setShowPaymentModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.paymentButton, styles.submitButton]}
                                onPress={handleSubmitPayment}
                            >
                                <Text style={styles.submitButtonText}>Record Reading</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

export default Page

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
        marginTop: 5,
    },
    section: {
        marginBottom: 12,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    radioGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioCircle: {
        height: 18,
        width: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    selectedRb: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },
    radioLabel: {
        fontSize: 14,
        color: '#333',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    disabledInput: {
        backgroundColor: '#f8f8f8',
        color: '#666',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        backgroundColor: 'white',
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownPlaceholder: {
        fontSize: 14,
        color: '#999',
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#666',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
        marginHorizontal: 10,
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: '#007AFF',
    },
    clearButton: {
        backgroundColor: '#6c757d',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    nextButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    clearButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomSpacer: {
        height: 80,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalItemText: {
        fontSize: 14,
        color: '#333',
    },
    modalCloseButton: {
        marginTop: 15,
        padding: 12,
        backgroundColor: '#007AFF',
        borderRadius: 6,
        alignItems: 'center',
    },
    modalCloseText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Payment Modal Styles
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    paymentModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    paymentHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    paymentScrollView: {
        maxHeight: 400,
    },
    paymentModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 10,
    },
    paymentButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    submitButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    noticeSection: {
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 6,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
        marginTop: 10,
    },
    noticeText: {
        fontSize: 12,
        color: '#1565C0',
        fontStyle: 'italic',
    },
})